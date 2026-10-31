import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** 쿠팡에 보낸 기록이 있는 상세페이지 상품(실패 기록 제외, 30일 정리 뒤에는 사라진다) */
export async function registeredProductIds(userId: string): Promise<Set<string>> {
  const { data } = await createAdminClient().from("coupang_ops_jobs").select("product_id").eq("user_id", userId).neq("status", "failed");
  return new Set((data ?? []).map((r: { product_id: string }) => r.product_id));
}

/** 목록에서 이 상품 다음의, 아직 보내지 않은 상품(C2-6 연속 등록) */
export function nextProductId(ids: string[], currentId: string, registered: Set<string>): string | null {
  const after = ids.slice(ids.indexOf(currentId) + 1);
  return after.find((id) => !registered.has(id)) ?? null;
}
