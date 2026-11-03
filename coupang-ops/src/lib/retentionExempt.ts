// 30일 자동 삭제 예외 회원(관리자·시험 계정, 2026-10-31 승인·2026-11-03 재지시).
// 기준은 DB 한 곳 profiles.retention_exempt = true 이며 코드에 이메일을 적지 않는다. 근거: docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md

type ExemptAdmin = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** 예외 회원 id 목록. 읽지 못하면 오류를 던져 정리 전체를 멈춘다(예외 회원 자료를 잘못 지우지 않게). */
export async function loadRetentionExemptIds(admin: ExemptAdmin): Promise<Set<string>> {
  const { data, error } = await admin.from("profiles").select("id").eq("retention_exempt", true);
  if (error) throw new Error("자동 삭제 예외 회원 목록을 읽지 못했습니다.");
  return new Set((data ?? []).map((row: { id: string }) => row.id));
}

/** 정리 조회에 붙이는 `user_id not in (...)` 값. 예외 회원이 없으면 아무 회원과도 겹치지 않는 값. 읽지 못하면 오류(정리 중단). */
export async function retentionExemptFilter(admin: ExemptAdmin): Promise<string> {
  const ids = Array.from(await loadRetentionExemptIds(admin));
  return `(${ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000"})`;
}
