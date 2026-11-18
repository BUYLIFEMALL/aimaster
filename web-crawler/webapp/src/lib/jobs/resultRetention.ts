import "server-only";

// 수집 결과(엑셀) 조회 보관 기간 판정 — 미리보기·다운로드 두 route 공용(2026-11-18 T-07 F02).
// 기준은 DB 한 곳 profiles.retention_exempt(관리자·시험 계정 열외, 루트 지침 · docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md).
// 형식 참고: elevenst-register/src/lib/retentionExempt.ts. 단, 여기서는 조회 오류·행 없음·칸 없음·잘못된 타입을
// "예외 아님(false)"으로 접지 않고 503으로 막는다 — 확인하지 못한 상태로 기간을 판정하거나 Storage를 열지 않는다.

export const RESULT_RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;

// Supabase 클라이언트 전체 타입과 구조 비교하면 TS가 너무 깊이 펼친다(TS2589) — 받을 때는 from만 보고, 안에서 필요한 모양으로 좁힌다.
type ProfilesReader = { from(table: "profiles"): unknown };
type ProfilesQuery = {
  select(columns: "retention_exempt"): {
    eq(column: "id", value: string): { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> };
  };
};

export type RetentionCheck = { ok: true } | { ok: false; status: 410 | 503; error: string };

const UNKNOWN: RetentionCheck = {
  ok: false,
  status: 503,
  error: "결과 보관 기간을 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
};
const EXPIRED: RetentionCheck = {
  ok: false,
  status: 410,
  error: `보관 기간(${RESULT_RETENTION_DAYS}일)이 지나 이 결과는 조회할 수 없습니다.`,
};

/** admin(서버 키) 클라이언트로 그 회원 본인 1행만 읽는다. createdAt은 이미 본인 확인된 작업 행의 값. */
export async function checkResultRetention(
  admin: ProfilesReader,
  userId: string,
  createdAt: string | null | undefined,
  now: number = Date.now()
): Promise<RetentionCheck> {
  let exempt: unknown;
  try {
    const query = admin.from("profiles") as ProfilesQuery;
    const { data, error } = await query.select("retention_exempt").eq("id", userId).maybeSingle();
    if (error || !data || typeof data !== "object") return UNKNOWN;
    exempt = (data as { retention_exempt?: unknown }).retention_exempt;
  } catch {
    return UNKNOWN;
  }
  if (typeof exempt !== "boolean") return UNKNOWN;
  if (exempt) return { ok: true };
  const created = Date.parse(createdAt ?? "");
  if (!Number.isFinite(created)) return UNKNOWN;
  return created < now - RESULT_RETENTION_DAYS * DAY_MS ? EXPIRED : { ok: true };
}
