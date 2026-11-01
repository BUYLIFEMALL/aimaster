// 30일 자동 삭제 예외 회원(2026-11-01 주인님 승인: 관리자·시험 계정 두 곳).
// 기준은 DB 한 곳 profiles.retention_exempt = true 이며 코드에 이메일을 적지 않는다.
// 근거: docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md

type ExemptAdmin = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** 예외 회원 id 목록. 읽지 못하면 오류를 던져 정리 전체를 멈춘다(예외 회원 자료를 잘못 지우지 않게). */
export async function loadRetentionExemptIds(admin: ExemptAdmin): Promise<Set<string>> {
  const { data, error } = await admin.from("profiles").select("id").eq("retention_exempt", true);
  if (error) throw new Error("자동 삭제 예외 회원 목록을 읽지 못했습니다.");
  return new Set((data ?? []).map((row: { id: string }) => row.id));
}

/** PostgREST `not in` 필터 값. 빈 목록이면 null(필터를 걸지 않음). */
export function exemptInFilter(exempt: Set<string>): string | null {
  return exempt.size ? `(${[...exempt].join(",")})` : null;
}
