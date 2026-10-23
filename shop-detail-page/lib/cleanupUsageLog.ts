// 공용 기준 코드 `cleanup-usage-log`(2026-10-23) — 기준 파일 four-cut-comics/src/lib/cleanupUsageLog.ts.
// 사본은 직접 고치지 말고 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`(목록: docs/SHARED_MODULES.md).
// 30일 정리 작업이 회원별로 지운 개수를 usage_logs action `cleanup_expired`에 한 줄씩 남긴다
// (메인 관리자 「30일 자동 정리」 표·「운영 상태」 진행률). 기록이 실패해도 정리는 계속한다(오류 로그만).

export const CLEANUP_ACTION = "cleanup_expired";

/** 회원별 개수 묶음 — key는 관리자 표 이름표(images·videos·projects·tracks·posts·ideas 등) */
export type CleanupCounts = Map<string, Record<string, number>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 회원 한 명의 개수에 더한다(0 이하·회원 없음은 무시) */
export function addCleanupCount(counts: CleanupCounts, userId: string | null | undefined, key: string, n = 1): void {
  if (!userId || !(n > 0)) return;
  const m = counts.get(userId) ?? {};
  m[key] = (m[key] ?? 0) + n;
  counts.set(userId, m);
}

/** 저장소 경로 「<회원 id>/…」의 첫 폴더(회원 id 모양일 때만, 아니면 null) */
export function ownerFromPath(path: string | null | undefined): string | null {
  const first = (path ?? "").replace(/^\/+/, "").split("/")[0];
  return UUID.test(first) ? first : null;
}

/** 회원별 한 줄씩 기록. 기록한 회원 수를 돌려준다(실패하면 0). admin = 서비스 키 Supabase 클라이언트 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logCleanupUsage(admin: any, programSlug: string, counts: CleanupCounts): Promise<number> {
  try {
    if (!counts.size) return 0;
    const { data: program } = await admin.from("programs").select("id").eq("slug", programSlug).maybeSingle();
    if (!program) return 0;
    // Array.from·명시 타입: 사본을 쓰는 프로그램마다 tsconfig 대상 버전이 달라(ES5 대상이면 Map 펼치기가 안 됨) 어디서나 통하는 문법으로
    const rows = Array.from(counts.entries()).map(([user_id, m]: [string, Record<string, number>]) => ({
      user_id,
      program_id: program.id,
      action: CLEANUP_ACTION,
      quantity: Object.keys(m).reduce((sum: number, k: string) => sum + (m[k] ?? 0), 0),
      metadata: m,
    }));
    const { error } = await admin.from("usage_logs").insert(rows);
    if (error) throw error;
    return rows.length;
  } catch (e) {
    console.error("[cleanup] usage_logs 기록 실패:", e);
    return 0;
  }
}
