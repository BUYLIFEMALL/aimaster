"use server";

// 주문 알림(문자) 설정 — 몰 운영자 본인 솔라피 계정. 키·시크릿은 DB 함수로만 저장·읽기(표 직접 읽기 불가),
// 화면에는 「등록됨」만 돌려준다. 저장 뒤 몰 자동 작업(cron-job.org)을 1분 주기로 맞춘다(job-sync.ts).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { checkMobile, checkSenderPhone, classifySendError, digits, parseKinds, type Credentials } from "@/lib/notify";
import { getBalance, sendSms } from "@/lib/solapi";
import { LOCAL_SKIP_MESSAGE, syncStoreJob } from "./job-sync";

export type NotifyState = { error: string | null; message: string | null; sender: string; staff: string; kinds: string[] };

export async function saveNotifyAction(slug: string, _prev: NotifyState, form: FormData): Promise<NotifyState> {
  const sender = String(form.get("sender_phone") ?? "").trim();
  const staff = String(form.get("staff_phone") ?? "").trim();
  const kinds = parseKinds(form.getAll("kinds").map(String));
  const keyInput = String(form.get("api_key") ?? "").trim();
  const secretInput = String(form.get("api_secret") ?? "").trim();
  const removeKey = form.get("remove_key") === "on";
  const back = (error: string | null, message: string | null): NotifyState => ({ error, message, sender, staff, kinds });

  const phoneError = checkSenderPhone(sender) ?? checkMobile(staff);
  if (phoneError) return back(phoneError, null);
  if ((keyInput && !secretInput) || (!keyInput && secretInput)) return back("API 키와 API 시크릿은 함께 입력해 주세요.", null);

  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { data: before, error: readError } = await supabase.rpc("mall_builder_notify_credentials", { p_store_id: store.id });
  if (readError) return back(readError.message, null);
  const willHaveKey = removeKey ? false : Boolean(keyInput) || Boolean((before as Credentials).api_key);
  if (kinds.length && !willHaveKey) return back("알림을 켜려면 솔라피 API 키와 시크릿을 먼저 입력해 주세요.", null);
  if (kinds.length && !digits(sender)) return back("알림을 켜려면 솔라피에 등록한 발신번호를 입력해 주세요.", null);
  if (kinds.includes("staff_new_order") && !digits(staff)) return back("「새 주문 → 운영자」를 켜려면 알림 받을 번호를 입력해 주세요.", null);

  const { error } = await supabase.rpc("mall_builder_notify_save", {
    p_store_id: store.id,
    p_sender_phone: sender,
    p_staff_phone: staff,
    p_kinds: kinds,
    p_api_key: removeKey ? "" : keyInput || null,
    p_api_secret: removeKey ? "" : secretInput || null,
  });
  if (error) return back(error.message, null);

  try {
    const sync = await syncStoreJob(supabase, store.id, slug);
    revalidatePath(`/s/${slug}/admin/settings`);
    if (sync.skippedLocal) return back(null, LOCAL_SKIP_MESSAGE);
    if (!kinds.length) return back(null, "저장했습니다. 켜 둔 알림이 없어 문자를 보내지 않습니다.");
    if (!sync.hasKey) return back(null, "저장했습니다. 위 「입금 기한 자동 취소」 칸에 cron-job.org API 키를 등록하면 알림 발송이 시작됩니다.");
    return back(null, `저장했습니다. 알림 ${kinds.length}종을 켰습니다. 1분마다 확인해 문자를 보냅니다.`);
  } catch (e) {
    return back(e instanceof Error ? e.message : "cron-job.org 연결에 실패했습니다.", null);
  }
}

/** 알림 받을 번호로 시험 문자 1건(운영자 본인만, 유료) */
export async function sendTestSmsAction(slug: string): Promise<{ error: string | null; message: string | null }> {
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_notify_credentials", { p_store_id: store.id });
  if (error) return { error: error.message, message: null };
  const c = data as Credentials & { staff_phone: string };
  if (!c.api_key || !c.api_secret) return { error: "솔라피 API 키와 시크릿을 먼저 저장해 주세요.", message: null };
  if (!c.sender_phone) return { error: "발신번호를 먼저 저장해 주세요.", message: null };
  if (!c.staff_phone) return { error: "알림 받을 번호를 먼저 저장해 주세요.", message: null };

  const body = `[${store.name}] 주문 알림 시험 문자입니다. 이 문자가 오면 설정이 맞습니다.`;
  let ok = true;
  let detail = "";
  try {
    await sendSms(c, c.staff_phone, body);
  } catch (e) {
    ok = false;
    detail = classifySendError(e).message;
  }
  await supabase.rpc("mall_builder_notify_log_test", { p_store_id: store.id, p_to: c.staff_phone, p_body: body, p_ok: ok, p_error: detail });
  revalidatePath(`/s/${slug}/admin/settings`);
  return ok ? { error: null, message: "시험 문자를 보냈습니다. 핸드폰을 확인해 주세요." } : { error: `시험 문자를 보내지 못했습니다: ${detail}`, message: null };
}

/** 솔라피 잔액(버튼을 누를 때만 조회) */
export async function balanceAction(slug: string): Promise<{ error: string | null; text: string | null }> {
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_notify_credentials", { p_store_id: store.id });
  if (error) return { error: error.message, text: null };
  const c = data as Credentials;
  if (!c.api_key || !c.api_secret) return { error: "솔라피 API 키와 시크릿을 먼저 저장해 주세요.", text: null };
  try {
    const b = await getBalance(c);
    return { error: null, text: `잔액 ${b.balance.toLocaleString("ko-KR")}원 · 포인트 ${b.point.toLocaleString("ko-KR")}` };
  } catch (e) {
    return { error: `잔액을 읽지 못했습니다: ${classifySendError(e).message}`, text: null };
  }
}
