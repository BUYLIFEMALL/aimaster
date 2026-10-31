import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { THIS_PROGRAM_SLUG } from "@/lib/access";
import { gapLeftSeconds } from "@/lib/readGapRule";

// 쿠팡 조회 간격 제한(C3-1 백로그 「Fixie 사용량 보호」). 운영 쿠팡 호출은 모두 고정 IP 프록시(FIXIE_URL, 운영자 비용)를 거치므로
// 버튼을 연달아 눌러도 같은 조회가 짧은 간격으로 반복되지 않게 서버에서 막는다.
// 기록은 공용 usage_logs(회원별, 서버 키로만 쓰기)에 남기고 마지막 기록 시각과 비교한다 — 새 표 없음. 주문 내용은 남기지 않는다.

let programId: string | null = null;
export async function thisProgramId(admin: ReturnType<typeof createAdminClient>): Promise<string | null> {
  if (programId) return programId;
  const { data } = await admin.from("programs").select("id").eq("slug", THIS_PROGRAM_SLUG).maybeSingle();
  programId = (data?.id as string | undefined) ?? null;
  return programId;
}

/** 통과하면 이번 조회를 기록하고 0, 너무 이르면 남은 초를 돌려준다. 기록을 못 읽으면 막지 않는다(조회 자체가 막히지 않게). */
export async function takeReadSlot(userId: string, action: string, gapSeconds: number): Promise<number> {
  const admin = createAdminClient();
  const pid = await thisProgramId(admin);
  if (!pid) return 0;
  const since = new Date(Date.now() - gapSeconds * 1000).toISOString();
  const { data } = await admin
    .from("usage_logs")
    .select("created_at")
    .eq("user_id", userId)
    .eq("program_id", pid)
    .eq("action", action)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  const left = gapLeftSeconds(data?.[0]?.created_at as string | undefined, Date.now(), gapSeconds);
  if (left > 0) return left;
  await admin.from("usage_logs").insert({ user_id: userId, program_id: pid, action, quantity: 1, credits_used: 0, metadata: null });
  return 0;
}
