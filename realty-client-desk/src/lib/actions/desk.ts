"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, newIntakeToken } from "@/lib/desk/token";
import { CLIENT_STATUSES, CONSENT_METHODS, CONSENT_VERSION, DEAL_TYPES, PROPERTY_TYPES, isSideOf, normalizePhone, parseManwon } from "@/lib/desk/consent";

// 1단계(2026-11-03): 접수 링크·관심고객. 표는 타입 생성 전이라 느슨한 클라이언트로 부른다. 모든 쓰기는 회원 권한 + user_id 조건.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const LINKS = "realty_desk_intake_links";
const CLIENTS = "realty_desk_clients";
const INTAKE_DAILY_CAP = 50; // 링크 하나당 하루 접수 상한(장난 접수 막기)

export interface DeskState {
  error?: string;
  success?: string;
  token?: string; // 새 접수 링크 값(만들 때 한 번만 보여 줌)
}

/** 고객 조건 칸 읽기 — 접수 링크·직접 입력 공통 */
function readClientFields(formData: FormData): { error: string } | { row: Record<string, unknown> } {
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const dealType = String(formData.get("dealType") ?? "");
  if (!name) return { error: "이름을 넣어 주세요." };
  if (!phone) return { error: "휴대폰 번호(010으로 시작)를 넣어 주세요." };
  if (!(DEAL_TYPES as readonly string[]).includes(dealType)) return { error: "원하는 거래(매매·전세·월세)를 골라 주세요." };
  const dealSide = String(formData.get("dealSide") ?? "");
  if (!isSideOf(dealType, dealSide)) return { error: dealType === "매매" ? "매수인지 매도인지 골라 주세요." : "임차(구함)인지 임대(내놓음)인지 골라 주세요." };
  const budgetMin = parseManwon(String(formData.get("budgetMin") ?? ""));
  const budgetMax = parseManwon(String(formData.get("budgetMax") ?? ""));
  const monthlyMax = parseManwon(String(formData.get("monthlyMax") ?? ""));
  if ([budgetMin, budgetMax, monthlyMax].some((v) => Number.isNaN(v))) return { error: "예산은 「8억」「3.5억」「5000」처럼 넣어 주세요." };
  const area = String(formData.get("areaMin") ?? "").trim();
  const areaMin = area ? Number(area) : null;
  if (areaMin !== null && !(areaMin > 0 && areaMin < 100000)) return { error: "면적은 숫자(㎡)로 넣어 주세요." };
  const types = formData.getAll("propertyTypes").map(String).filter((t) => (PROPERTY_TYPES as readonly string[]).includes(t));
  return {
    row: {
      name,
      phone,
      deal_type: dealType,
      deal_side: dealSide,
      regions: String(formData.get("regions") ?? "").trim().slice(0, 200) || null,
      property_types: types,
      budget_min: budgetMin,
      budget_max: budgetMax,
      monthly_max: monthlyMax,
      area_min: areaMin,
      move_in: String(formData.get("moveIn") ?? "").trim().slice(0, 40) || null,
      memo: String(formData.get("memo") ?? "").trim().slice(0, 1000) || null,
    },
  };
}

export async function createIntakeLinkAction(_prev: DeskState, formData: FormData): Promise<DeskState> {
  const user = await requireProgramAccess();
  const officeName = String(formData.get("officeName") ?? "").trim().slice(0, 60);
  const officePhone = String(formData.get("officePhone") ?? "").trim().slice(0, 30) || null;
  if (!officeName) return { error: "고객 화면에 보일 사무소 이름을 넣어 주세요." };
  const token = newIntakeToken();
  const db = (await createClient()) as unknown as SupabaseLike;
  const { error } = await db.from(LINKS).insert({ user_id: user.id, office_name: officeName, office_phone: officePhone, token_hash: hashToken(token) });
  if (error) return { error: `링크를 만들지 못했습니다: ${error.message}` };
  revalidatePath("/intake");
  return { success: "접수 링크를 만들었어요. 아래 주소는 지금 한 번만 보여요 — 바로 복사해 두세요.", token };
}

export async function toggleIntakeLinkAction(formData: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "1";
  const db = (await createClient()) as unknown as SupabaseLike;
  await db.from(LINKS).update({ is_active: active }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/intake");
}

export async function addClientAction(_prev: DeskState, formData: FormData): Promise<DeskState> {
  const user = await requireProgramAccess();
  // 결정 1(2026-11-03): 수기 입력은 「동의 받음」을 체크하고 방법·날짜를 남겨야 저장
  if (formData.get("consented") !== "on") return { error: "고객에게 개인정보 수집·이용 동의를 받은 경우에만 저장할 수 있어요. 「동의를 받았습니다」를 체크해 주세요." };
  const method = String(formData.get("consentMethod") ?? "");
  if (!(CONSENT_METHODS as readonly string[]).includes(method)) return { error: "동의를 받은 방법을 골라 주세요." };
  const day = String(formData.get("consentDate") ?? "");
  const consentAt = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00+09:00`) : null;
  if (!consentAt || consentAt.getTime() > Date.now() + 86_400_000) return { error: "동의를 받은 날짜를 골라 주세요(오늘 또는 이전)." };
  const read = readClientFields(formData);
  if ("error" in read) return read;
  const adConsent = formData.get("adConsented") === "on";
  const db = (await createClient()) as unknown as SupabaseLike;
  const { error } = await db.from(CLIENTS).insert({
    ...read.row,
    user_id: user.id,
    source: "manual",
    consent_at: consentAt.toISOString(),
    consent_method: method,
    consent_version: CONSENT_VERSION,
    ad_consent_at: adConsent ? consentAt.toISOString() : null,
  });
  if (error) return { error: `저장하지 못했습니다: ${error.message}` };
  revalidatePath("/clients");
  return { success: "고객을 저장했어요." };
}

export async function updateClientAction(formData: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const db = (await createClient()) as unknown as SupabaseLike;
  const status = String(formData.get("status") ?? "");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ((CLIENT_STATUSES as readonly string[]).includes(status)) {
    patch.status = status;
    patch.last_contact_at = new Date().toISOString();
  }
  if (formData.get("adOptout") === "1") patch.ad_optout_at = new Date().toISOString(); // 수신거부(고객이 전화로 요청한 경우 등)
  await db.from(CLIENTS).update(patch).eq("id", id).eq("user_id", user.id);
  revalidatePath("/clients");
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const db = (await createClient()) as unknown as SupabaseLike;
  await db.from(CLIENTS).delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/clients");
}

/** 고객 접수 링크(로그인 없음): 링크 해시로 회원을 찾아 그 회원 줄로만 넣는다 */
export async function submitIntakeAction(_prev: DeskState, formData: FormData): Promise<DeskState> {
  const token = String(formData.get("token") ?? "");
  if (formData.get("consented") !== "on") return { error: "개인정보 수집·이용에 동의하셔야 접수할 수 있어요. 동의하지 않으시면 사무소에 전화로 문의해 주세요." };
  if (String(formData.get("website") ?? "")) return { success: "접수됐어요." }; // 자동 입력 봇 거르기(숨은 칸)
  const admin = createAdminClient() as unknown as SupabaseLike;
  const { data: link } = await admin.from(LINKS).select("id, user_id, is_active").eq("token_hash", hashToken(token)).maybeSingle();
  if (!link || !link.is_active) return { error: "이 접수 링크는 지금 쓸 수 없어요. 사무소에 문의해 주세요." };
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from(CLIENTS).select("id", { count: "exact", head: true }).eq("intake_link_id", link.id).gte("created_at", since);
  if ((count ?? 0) >= INTAKE_DAILY_CAP) return { error: "오늘 접수가 많아 잠시 받을 수 없어요. 사무소에 전화로 문의해 주세요." };
  const read = readClientFields(formData);
  if ("error" in read) return read;
  const now = new Date().toISOString();
  const { error } = await admin.from(CLIENTS).insert({
    ...read.row,
    user_id: link.user_id,
    source: "intake",
    intake_link_id: link.id,
    consent_at: now,
    consent_method: "링크",
    consent_version: CONSENT_VERSION,
    ad_consent_at: formData.get("adConsented") === "on" ? now : null,
  });
  if (error) return { error: "접수하지 못했어요. 잠시 뒤 다시 해 주세요." };
  return { success: "접수됐어요. 사무소에서 곧 연락드릴게요." };
}
