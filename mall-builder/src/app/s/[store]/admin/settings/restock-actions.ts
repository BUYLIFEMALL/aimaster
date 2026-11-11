"use server";

// 재입고 알림(D16) 켜기·끄기 — 문자·메일 따로. 발송은 주문 알림과 같은 솔라피·Resend 설정과 1분 작업을 쓴다.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { digits, type Credentials } from "@/lib/notify";
import { LOCAL_SKIP_MESSAGE, syncStoreJob } from "./job-sync";

export type RestockState = { error: string | null; message: string | null };

export async function saveRestockAction(slug: string, _prev: RestockState, form: FormData): Promise<RestockState> {
  const sms = form.get("restock_sms") === "on";
  const email = form.get("restock_email") === "on";
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const [smsRes, mailRes] = await Promise.all([
    supabase.rpc("mall_builder_notify_credentials", { p_store_id: store.id }),
    supabase.rpc("mall_builder_email_credentials", { p_store_id: store.id }),
  ]);
  const readError = smsRes.error ?? mailRes.error;
  if (readError) return { error: readError.message, message: null };
  const s = (smsRes.data ?? {}) as Partial<Credentials>;
  const m = (mailRes.data ?? {}) as { api_key?: string; from?: string };
  if (sms && !(s.api_key && s.api_secret && digits(s.sender_phone ?? ""))) {
    return { error: "문자로 보내려면 아래 「주문 알림(문자)」에 솔라피 키·발신번호를 먼저 저장해 주세요.", message: null };
  }
  if (email && !(m.api_key && m.from)) {
    return { error: "메일로 보내려면 아래 「주문 알림(메일)」에 Resend 키·보내는 주소를 먼저 저장해 주세요.", message: null };
  }

  const { error } = await supabase.rpc("mall_builder_restock_notify_save", { p_store_id: store.id, p_sms: sms, p_email: email });
  if (error) return { error: error.message, message: null };
  try {
    const sync = await syncStoreJob(supabase, store.id, slug);
    revalidatePath(`/s/${slug}/admin/settings`);
    revalidatePath(`/s/${slug}/admin/restock`);
    if (sync.skippedLocal) return { error: null, message: LOCAL_SKIP_MESSAGE };
    if (!sms && !email) return { error: null, message: "재입고 알림을 껐습니다. 손님 신청은 계속 받고, 다시 켜면 그다음 재입고 때 보냅니다." };
    if (!sync.hasKey) return { error: null, message: "저장했습니다. 「입금 기한 자동 취소」 칸에 cron-job.org API 키를 등록하면 발송이 시작됩니다." };
    const channels = [sms && "문자", email && "메일"].filter(Boolean).join("·");
    return { error: null, message: `저장했습니다. 재고가 다시 생기면 1분 안에 ${channels}로 알립니다.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "cron-job.org 연결에 실패했습니다.", message: null };
  }
}
