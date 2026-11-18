// 출처: ai-video-studio/lib/retentionExempt.ts (기준 커밋 82ed32bca) 내용을 그대로 가져옴 — 2026-11-18 W01b, CC-SNS-01. 공용 기준 미등록 파일이라 수정은 원본과 함께 맞춘다.
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

/** 화면 표시용 — 이 회원이 30일 삭제 예외인가(못 읽으면 false: 삭제 예정일을 그대로 보여 줄 뿐 지우지는 않음) */
export async function isRetentionExempt(admin: ExemptAdmin, userId: string): Promise<boolean> {
  const { data, error } = await admin.from("profiles").select("retention_exempt").eq("id", userId).maybeSingle();
  return !error && data?.retention_exempt === true;
}

// ── 아래는 AI Influencer 추가분(2026-11-18 W01b, CC-SNS-01) — 위 원본 함수는 바꾸지 않았다.
// 원본 loadRetentionExemptIds는 오류 없이 data가 null이면 빈 목록으로 보아 "예외 회원 없음"이 된다(삭제 쪽으로 열림).
// 자동 삭제 판단에는 응답 모양까지 확인하는 이 함수를 쓴다: 오류·null·배열 아님·id 없는 행이면 오류를 던진다.
export async function loadRetentionExemptIdsStrict(admin: ExemptAdmin): Promise<Set<string>> {
  const { data, error } = await admin.from("profiles").select("id").eq("retention_exempt", true);
  if (error) throw new Error("자동 삭제 예외 회원 목록을 읽지 못했습니다.");
  if (!Array.isArray(data)) throw new Error("자동 삭제 예외 회원 목록 응답이 올바르지 않습니다.");
  const ids = new Set<string>();
  for (const row of data) {
    if (!row || typeof row.id !== "string" || !row.id) throw new Error("자동 삭제 예외 회원 목록 응답이 올바르지 않습니다.");
    ids.add(row.id);
  }
  return ids;
}
