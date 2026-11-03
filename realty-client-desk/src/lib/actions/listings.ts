"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/solapi/client";
import { DEAL_TYPES, PROPERTY_TYPES, parseManwon } from "@/lib/desk/consent";
import { LISTING_STATUSES, adEligibility, composeAd, isNightKst, matchReasons, type Office } from "@/lib/desk/adRules";

// 2단계(2026-11-03, v1.03): 사무소 정보·내 매물·매물 안내 문자(광고). 모든 쓰기는 회원 권한 + user_id 조건.
// 발송 규칙(결정 2): 광고 동의한 고객만·밤 9시~아침 8시 막음·「(광고)」/무료 수신거부 자동·중개사가 고른 고객에게만·회원 본인 SOLAPI.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const OFFICES = "realty_desk_offices";
const LISTINGS = "realty_desk_listings";
const CLIENTS = "realty_desk_clients";
const SENDS = "realty_desk_sends";
const SITE = "https://realty-client-desk.buylife.xyz";
const SEND_CAP = 30; // 한 번에 보내는 상한

export interface ListingState {
  error?: string;
  success?: string;
}

const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max) || null;

export async function saveOfficeAction(_prev: ListingState, fd: FormData): Promise<ListingState> {
  const user = await requireProgramAccess();
  const officeName = text(fd, "officeName", 40);
  const officePhone = text(fd, "officePhone", 20);
  const reject = text(fd, "reject080", 20);
  if (!officeName) return { error: "사무소 이름을 넣어 주세요(광고 문자 맨 앞에 들어가요)." };
  if (!officePhone || officePhone.replace(/\D/g, "").length < 7) return { error: "사무소 전화번호를 넣어 주세요(광고 문자 맨 앞에 들어가요)." };
  if (reject && !/^080-?\d{3,4}-?\d{4}$/.test(reject)) return { error: "080 무료 수신거부 번호는 「080-123-4567」 모양이에요. 없으면 비워 두세요." };
  const db = (await createClient()) as unknown as SupabaseLike;
  const { error } = await db.from(OFFICES).upsert(
    { user_id: user.id, office_name: officeName, office_phone: officePhone, office_address: text(fd, "officeAddress", 120), reject_080: reject, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { error: `저장하지 못했어요: ${error.message}` };
  revalidatePath("/settings");
  return { success: "사무소 정보를 저장했어요." };
}

function readListing(fd: FormData): { error: string } | { row: Record<string, unknown> } {
  const title = text(fd, "title", 60);
  const dealType = String(fd.get("dealType") ?? "");
  const propertyType = String(fd.get("propertyType") ?? "");
  const address = text(fd, "address", 120);
  if (!title) return { error: "매물 이름을 넣어 주세요(예: 백석동 동문굿모닝힐 84㎡)." };
  if (!(DEAL_TYPES as readonly string[]).includes(dealType)) return { error: "거래 종류를 골라 주세요." };
  if (!(PROPERTY_TYPES as readonly string[]).includes(propertyType)) return { error: "매물 종류를 골라 주세요." };
  if (!address) return { error: "소재지를 넣어 주세요(동 이름이 들어가야 고객 지역과 맞춰 봐요)." };
  const price = parseManwon(String(fd.get("price") ?? ""));
  const monthly = parseManwon(String(fd.get("monthly") ?? ""));
  if (price === null || Number.isNaN(price)) return { error: "가격(보증금)을 「8억」「3.5억」「5000」처럼 넣어 주세요." };
  if (Number.isNaN(monthly)) return { error: "월세는 만 원 단위 숫자로 넣어 주세요." };
  if (dealType === "월세" && monthly === null) return { error: "월세 매물은 월세 금액도 넣어 주세요." };
  const areaRaw = String(fd.get("area") ?? "").trim();
  const area = areaRaw ? Number(areaRaw) : null;
  if (area !== null && !(area > 0 && area < 100000)) return { error: "전용면적은 숫자(㎡)로 넣어 주세요." };
  const int = (k: string) => {
    const v = String(fd.get(k) ?? "").trim();
    return v && /^\d{1,2}$/.test(v) ? Number(v) : null;
  };
  return {
    row: {
      title, deal_type: dealType, property_type: propertyType, address, price,
      monthly: dealType === "월세" ? monthly : null, area_m2: area,
      floor_info: text(fd, "floorInfo", 30), rooms: int("rooms"), baths: int("baths"), direction: text(fd, "direction", 20),
      move_in: text(fd, "moveIn", 40), parking: text(fd, "parking", 30), approval_date: text(fd, "approvalDate", 20),
      mgmt_fee: text(fd, "mgmtFee", 40), memo: text(fd, "memo", 1000),
    },
  };
}

export async function addListingAction(_prev: ListingState, fd: FormData): Promise<ListingState> {
  const user = await requireProgramAccess();
  const read = readListing(fd);
  if ("error" in read) return read;
  const db = (await createClient()) as unknown as SupabaseLike;
  const { error } = await db.from(LISTINGS).insert({ ...read.row, user_id: user.id });
  if (error) return { error: `저장하지 못했어요: ${error.message}` };
  revalidatePath("/listings");
  return { success: "매물을 저장했어요. 목록에서 「맞는 고객 보기」를 눌러 보세요." };
}

export async function updateListingStatusAction(fd: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const status = String(fd.get("status") ?? "");
  if (!(LISTING_STATUSES as readonly string[]).includes(status)) return;
  const db = (await createClient()) as unknown as SupabaseLike;
  await db.from(LISTINGS).update({ status, updated_at: new Date().toISOString() }).eq("id", String(fd.get("id") ?? "")).eq("user_id", user.id);
  revalidatePath("/listings");
}

export async function deleteListingAction(fd: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  await db.from(LISTINGS).delete().eq("id", String(fd.get("id") ?? "")).eq("user_id", user.id);
  revalidatePath("/listings");
}

export interface SendState {
  error?: string;
  success?: string;
  results?: { name: string; ok: boolean; note: string }[];
}

/** 중개사가 고른 고객에게 매물 안내 문자(광고)를 보낸다. 받는 사람마다 기록을 먼저 넣어 자리를 잡고(겹친 요청으로 두 번 안 감) 보낸다. */
export async function sendListingAdAction(_prev: SendState, fd: FormData): Promise<SendState> {
  const user = await requireProgramAccess();
  if (isNightKst()) return { error: "밤 9시~아침 8시에는 광고 문자를 보낼 수 없어요(정보통신망법 — 별도 야간 동의가 필요). 아침 8시 이후에 보내 주세요." };
  const listingId = String(fd.get("listingId") ?? "");
  const body = String(fd.get("body") ?? "").trim();
  const ids = [...new Set(fd.getAll("clientIds").map(String))];
  if (!body) return { error: "보낼 내용을 넣어 주세요." };
  if (body.length > 600) return { error: "내용이 너무 길어요(600자 안으로)." };
  if (ids.length === 0) return { error: "보낼 고객을 한 명 이상 골라 주세요." };
  if (ids.length > SEND_CAP) return { error: `한 번에 ${SEND_CAP}명까지 보낼 수 있어요.` };

  const db = (await createClient()) as unknown as SupabaseLike;
  const [{ data: office }, { data: listing }, { data: account }] = await Promise.all([
    db.from(OFFICES).select("office_name, office_phone, office_address, reject_080").eq("user_id", user.id).maybeSingle(),
    db.from(LISTINGS).select("*").eq("id", listingId).eq("user_id", user.id).maybeSingle(),
    db.from("user_solapi_accounts").select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!office) return { error: "먼저 「API키등록·플랫폼연동」에서 사무소 이름·전화번호를 저장해 주세요(광고 문자 맨 앞에 들어가요)." };
  if (!account) return { error: "먼저 「API키등록·플랫폼연동」에서 본인 SOLAPI 계정을 등록해 주세요." };
  if (!listing) return { error: "매물을 찾지 못했어요." };
  if (listing.status !== "광고 중") return { error: "「광고 중」인 매물만 안내할 수 있어요." };

  const { data: clients } = await db.from(CLIENTS).select("*").eq("user_id", user.id).in("id", ids);
  const results: NonNullable<SendState["results"]> = [];
  for (const c of clients ?? []) {
    const elig = adEligibility(c);
    if (!elig.ok) { results.push({ name: c.name, ok: false, note: elig.reason }); continue; }
    if (!matchReasons(c, listing)) { results.push({ name: c.name, ok: false, note: "조건이 맞지 않음" }); continue; }
    let token: string = c.optout_token;
    if (!token) {
      token = randomBytes(12).toString("base64url");
      await db.from(CLIENTS).update({ optout_token: token }).eq("id", c.id).eq("user_id", user.id);
    }
    const message = composeAd(office as Office, body, `${SITE}/u/${token}`);
    const { data: claim, error: claimErr } = await db.from(SENDS)
      .insert({ user_id: user.id, client_id: c.id, listing_id: listing.id, to_phone: c.phone, is_ad: true, body: message })
      .select("id").maybeSingle();
    if (claimErr || !claim) { results.push({ name: c.name, ok: false, note: "이 매물은 이미 보냈어요" }); continue; }
    try {
      await sendSms(account, String(c.phone).replace(/-/g, ""), message);
      await db.from(SENDS).update({ status: "sent" }).eq("id", claim.id).eq("user_id", user.id);
      await db.from(CLIENTS).update({ last_contact_at: new Date().toISOString() }).eq("id", c.id).eq("user_id", user.id);
      results.push({ name: c.name, ok: true, note: "보냄" });
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 200) : "발송 실패";
      await db.from(SENDS).update({ status: "failed", error: msg }).eq("id", claim.id).eq("user_id", user.id);
      results.push({ name: c.name, ok: false, note: `실패: ${msg}` });
    }
  }
  revalidatePath(`/listings/${listingId}`);
  const sent = results.filter((r) => r.ok).length;
  return { success: `${sent}명에게 보냈어요${results.length > sent ? `, ${results.length - sent}명은 보내지 않았어요` : ""}.`, results };
}

/** 실패한 발송 기록 지우기(다시 보낼 수 있게) */
export async function deleteSendAction(fd: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  await db.from(SENDS).delete().eq("id", String(fd.get("id") ?? "")).eq("user_id", user.id).eq("status", "failed");
  revalidatePath(`/listings/${String(fd.get("listingId") ?? "")}`);
}

/** 수신거부 화면(로그인 없음): 링크 값 하나로 그 고객의 광고 수신만 끊는다(다른 정보는 묻지 않음 — 별표 6 공통 2) */
export async function optOutAction(_prev: { done?: string; error?: string }, fd: FormData): Promise<{ done?: string; error?: string }> {
  const token = String(fd.get("token") ?? "");
  if (!/^[\w-]{12,40}$/.test(token)) return { error: "링크가 올바르지 않아요." };
  const admin = createAdminClient() as unknown as SupabaseLike;
  const { data: c } = await admin.from(CLIENTS).select("id, ad_optout_at").eq("optout_token", token).maybeSingle();
  if (!c) return { error: "이 링크로 처리할 수 있는 수신 기록이 없어요. 이미 삭제된 정보일 수 있어요." };
  const at = c.ad_optout_at ?? new Date().toISOString();
  if (!c.ad_optout_at) await admin.from(CLIENTS).update({ ad_optout_at: at, updated_at: at }).eq("id", c.id);
  return { done: at };
}
