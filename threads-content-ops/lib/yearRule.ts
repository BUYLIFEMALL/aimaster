// 모든 콘텐츠 생성 AI 지시문에 붙이는 "기준 연도" 규칙 (루트 CLAUDE.md 핵심 원칙 8번, 2026-10-07 주인님 지시).
// 대형 언어 모델은 학습 컷오프 때문에 연도를 지정하지 않으면 2023~2024년을 현재처럼 쓴다. 해가 바뀌어도 유지되도록
// 연도를 하드코딩하지 않고 호출 시점의 한국 시간 기준 현재 연도를 넣는다. 화면과 서버가 같이 읽을 수 있게 "server-only"를 붙이지 않는다.

/** 한국 시간(KST) 기준 현재 연도. 서버가 UTC여도 12월 31일 밤·1월 1일 새벽에 연도가 어긋나지 않게 한다. */
export function currentYearKst(now = Date.now()): number {
  return new Date(now + 9 * 60 * 60 * 1000).getUTCFullYear();
}

export function yearRule(now = Date.now()): string {
  const currentYear = currentYearKst(now);
  return `[기준 연도 엄수: 현재 연도는 ${currentYear}년입니다. 모든 연도 표기, 정책, 정보, 가이드, 제목은 반드시 ${currentYear}년(당해 연도)을 기준으로 작성하세요. 과거 연도(2023년, 2024년 등)로 퇴행하지 마세요.]`;
}

/** 지시문(system/developer) 끝에 연도 규칙을 붙인다. 이미 붙어 있으면 한 번만 둔다. */
export function withYearRule(prompt: string, now = Date.now()): string {
  const rule = yearRule(now);
  return prompt.includes(rule) ? prompt : `${prompt}\n\n${rule}`;
}
