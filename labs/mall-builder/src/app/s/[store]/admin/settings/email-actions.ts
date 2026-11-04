"use server";

// 주문 알림(메일) 설정 — 몰 운영자 본인 Resend 계정. 키는 DB 함수로만 저장·읽기(표 직접 읽기 불가), 화면에는 「등록됨」만 돌려준다.
// 저장 뒤 몰 자동 작업(cron-job.org)을 1분 주기로 맞춘다(job-sync.ts).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { parseKinds } from "@/lib/notify";
import { buildEmail, checkEmail, sendEmail } from "@/lib/resend";
import { LOCAL_SKIP_MESSAGE, siteOrigin, syncStoreJob } from "./job-sync";

export type EmailState = { error: string | null; message: string | null; from: string; staff: string; kinds: string[] };

export async function saveEmailAction(slug: string, _prev: EmailState, form: FormData): Promise<EmailState> {
  const from = String(form.get("email_from") ?? "").trim();
  const staff = String(form.get("staff_email") ?? "").trim();
  const kinds = parseKinds(form.getAll("email_kinds").map(String));
  const keyInput = String(form.get("resend_key") ?? "").trim();
  const removeKey = form.get("remove_resend_key") === "on";
  const back = (error: string | null, message: string | null): EmailState => ({ error, message, from, staff, kinds });

  const formatError = checkEmail(from) ?? checkEmail(staff);
  if (formatError) return back(formatError, null);

  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { data: before, error: readError } = await supabase.rpc("mall_builder_email_credentials", { p_store_id: store.id });
  if (readError) return back(readError.message, null);
  const willHaveKey = removeKey ? false : Boolean(keyInput) || Boolean((before as { api_key: string }).api_key);
  if (kinds.length && !willHaveKey) return back("메일 알림을 켜려면 Resend API 키를 먼저 입력해 주세요.", null);
  if (kinds.length && !from) return back("메일 알림을 켜려면 Resend에서 인증한 도메인의 보내는 주소를 입력해 주세요.", null);
  if (kinds.includes("staff_new_order") && !staff) return back("「새 주문 → 운영자」를 켜려면 받을 메일을 입력해 주세요.", null);

  const { error } = await supabase.rpc("mall_builder_email_save", {
    p_store_id: store.id,
    p_from: from,
    p_staff_email: staff,
    p_kinds: kinds,
    p_api_key: removeKey ? "" : keyInput || null,
  });
  if (error) return back(error.message, null);

  try {
    const sync = await syncStoreJob(supabase, store.id, slug);
    revalidatePath(`/s/${slug}/admin/settings`);
    if (sync.skippedLocal) return back(null, LOCAL_SKIP_MESSAGE);
    if (!kinds.length) return back(null, "저장했습니다. 켜 둔 메일 알림이 없어 메일을 보내지 않습니다.");
    if (!sync.hasKey) return back(null, "저장했습니다. 위 「입금 기한 자동 취소」 칸에 cron-job.org API 키를 등록하면 메일 발송이 시작됩니다.");
    return back(null, `저장했습니다. 메일 알림 ${kinds.length}종을 켰습니다. 1분마다 확인해 보냅니다. 먼저 「시험 메일 보내기」로 도메인 인증을 확인해 주세요.`);
  } catch (e) {
    return back(e instanceof Error ? e.message : "cron-job.org 연결에 실패했습니다.", null);
  }
}

/** 받을 메일로 시험 메일 1통(운영자 본인만) */
export async function sendTestEmailAction(slug: string): Promise<{ error: string | null; message: string | null }> {
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_email_credentials", { p_store_id: store.id });
  if (error) return { error: error.message, message: null };
  const c = data as { api_key: string; from: string; staff_email: string };
  if (!c.api_key) return { error: "Resend API 키를 먼저 저장해 주세요.", message: null };
  if (!c.from) return { error: "보내는 주소를 먼저 저장해 주세요.", message: null };
  if (!c.staff_email) return { error: "받을 메일을 먼저 저장해 주세요.", message: null };

  const subject = `[${store.name}] 주문 알림 시험 메일`;
  const body = `[${store.name}] 주문 알림 시험 메일입니다. 이 메일이 오면 Resend 키와 보내는 주소(도메인 인증)가 맞습니다.`;
  const payload = buildEmail(
    { id: crypto.randomUUID(), order_id: null, kind: "email_test", to: c.staff_email, subject, body },
    { api_key: c.api_key, from: c.from, store_name: store.name, slug },
    await siteOrigin(),
  );
  const r = await sendEmail(c.api_key, payload, crypto.randomUUID());
  const ok = r.result === "sent";
  await supabase.rpc("mall_builder_email_log_test", { p_store_id: store.id, p_to: c.staff_email, p_subject: subject, p_body: body, p_ok: ok, p_error: r.error });
  revalidatePath(`/s/${slug}/admin/settings`);
  return ok ? { error: null, message: "시험 메일을 보냈습니다. 받은편지함(없으면 스팸함)을 확인해 주세요." } : { error: `시험 메일을 보내지 못했습니다: ${r.error}`, message: null };
}
