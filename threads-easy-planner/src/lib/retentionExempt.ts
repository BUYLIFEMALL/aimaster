// 30일 자동 삭제·조회 숨김 예외 회원(관리자·시험 계정, 2026-10-31 승인·2026-11-03 재지시, 2026-11-13 이 프로그램 적용).
// 기준은 DB 한 곳 profiles.retention_exempt = true 이며 코드에 이메일을 적지 않는다. 기준 구현: naver-blog-agent.
// 저장 구독으로 보관이 연장된 회원도 매일 자동으로 켜진다(member_storage_refresh_exempt) — 그 회원의 기간 초과분은 메인 중앙 정리가 지운다.
type ExemptAdmin = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** 이 회원이 예외 회원인지. 읽지 못하면 true — 지우지 않는 쪽이 안전하다(정리는 다음 조회 때 다시 시도). */
export async function isRetentionExempt(admin: ExemptAdmin, userId: string): Promise<boolean> {
  const { data, error } = await admin.from("profiles").select("retention_exempt").eq("id", userId).maybeSingle();
  if (error) return true;
  return data?.retention_exempt === true;
}
