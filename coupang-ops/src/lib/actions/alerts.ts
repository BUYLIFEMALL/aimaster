"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { refreshJobStatusAction } from "@/lib/actions/product";
import { RECHECK_GAP_SECONDS, RECHECK_LIMIT, RECHECK_STATUSES } from "@/lib/coupang/status";
import { takeReadSlot } from "@/lib/readGap";
import { createAdminClient } from "@/lib/supabase/admin";

export type RecheckResult = { ok: true; checked: number; failed: number } | { ok: false; error: string };

/** B3 결과를 아직 모르는 등록 기록 최근 5건의 상태를 다시 읽는다(읽기만, 상품당 2회 호출). 버튼을 눌렀을 때만 */
export async function recheckJobsAction(): Promise<RecheckResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." };
  const wait = await takeReadSlot(user.id, "coupang_recheck_read", RECHECK_GAP_SECONDS);
  if (wait > 0) return { ok: false, error: `조금 전에 확인했습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  const { data } = await createAdminClient().from("coupang_ops_jobs").select("id").eq("user_id", user.id).in("status", RECHECK_STATUSES).not("seller_product_id", "is", null).order("created_at", { ascending: false }).limit(RECHECK_LIMIT);
  let failed = 0;
  for (const job of data ?? []) {
    const r = await refreshJobStatusAction(job.id as string);
    if (!r.ok) failed++;
  }
  return { ok: true, checked: data?.length ?? 0, failed };
}
