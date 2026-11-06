"use server";

// 자동 배송 완료·구매 확정 설정(D12) — 일수만 저장하고, 몰 자동 작업(cron-job.org 작업 하나, job-sync.ts)을 맞춘다
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { parseAutoDays } from "@/lib/autoProgress";
import { LOCAL_SKIP_MESSAGE, syncStoreJob } from "./job-sync";

export type AutoProgressState = { error: string | null; message: string | null; deliver: string; confirm: string };

export async function saveAutoProgressAction(slug: string, _prev: AutoProgressState, form: FormData): Promise<AutoProgressState> {
  const deliverText = String(form.get("deliver_days") ?? "");
  const confirmText = String(form.get("confirm_days") ?? "");
  const keep = { deliver: deliverText, confirm: confirmText };
  const d = parseAutoDays(deliverText, "자동 배송 완료");
  if (!d.ok) return { error: d.error, message: null, ...keep };
  const c = parseAutoDays(confirmText, "자동 구매 확정");
  if (!c.ok) return { error: c.error, message: null, ...keep };

  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_auto_progress_save", { p_store_id: store.id, p_deliver_days: d.value, p_confirm_days: c.value });
  if (error) return { error: error.message, message: null, ...keep };

  try {
    const sync = await syncStoreJob(supabase, store.id, slug);
    revalidatePath(`/s/${slug}/admin/settings`);
    if (sync.skippedLocal) return { error: null, message: LOCAL_SKIP_MESSAGE, ...keep };
    const on = d.value !== null || c.value !== null;
    if (!on) return { error: null, message: "자동 배송 완료·구매 확정을 껐습니다.", ...keep };
    if (!sync.hasKey) return { error: null, message: "저장했습니다. 위 「입금 기한 자동 취소」 칸에 cron-job.org API 키를 등록하면 시작됩니다.", ...keep };
    const parts = [d.value !== null && `발송 ${d.value}일 뒤 배송 완료`, c.value !== null && `배송 완료 ${c.value}일 뒤 구매 확정`].filter(Boolean).join(", ");
    return { error: null, message: `켰습니다: ${parts}(${sync.everyMinute ? "1분" : "10분"}마다 확인). 지금 배송 중·배송 완료인 주문에도 바로 적용됩니다.`, ...keep };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "cron-job.org 연결에 실패했습니다.", message: null, ...keep };
  }
}
