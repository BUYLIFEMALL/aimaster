// 본문 생성 프롬프트의 "기준 연도"와 "목표 글자수" 규칙(2026-10-10, v1.42). 순수 함수라 서버·시험에서 같이 쓴다.
//
// 목표 글자수 단위는 **공백 제외 글자 수**로 통일한다. 화면은 "목표 글자수 2,000자"로 보여 주면서 예전 프롬프트는 이 숫자를
// "약 2,000단어(공백 제외 약 7,000자 이상)"로 지시해 의도보다 3배 이상 긴 글을 요구했다(네이버 에이전트 비교 보고서 §7).
export const MIN_TARGET_CHARS = 800
export const MAX_TARGET_CHARS = 3500
export const DEFAULT_TARGET_CHARS = 2000

/** 화면·API에서 온 값을 800~3,500자(100자 단위)로 정리한다. 숫자가 아니면 기본값. */
export function resolveTargetChars(value: unknown): number {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return DEFAULT_TARGET_CHARS
  const clamped = Math.min(MAX_TARGET_CHARS, Math.max(MIN_TARGET_CHARS, number))
  return Math.round(clamped / 100) * 100
}

/** 공백을 뺀 글자 수 */
export function countChars(text: string): number {
  return String(text || '').replace(/\s+/g, '').length
}

export function buildLengthRules(targetChars: number): { option: string; deepDive: string } {
  const lower = Math.round(targetChars * 0.9)
  const upper = Math.round(targetChars * 1.15)
  const perParagraph = Math.round(targetChars / 4)
  return {
    option: `- 목표 분량: 4개 문단 합계 공백 제외 약 ${targetChars.toLocaleString('ko-KR')}자 (${lower.toLocaleString('ko-KR')}~${upper.toLocaleString('ko-KR')}자 범위)로 작성하세요.`,
    deepDive: `각 문단("문단 1"~"문단 4")은 구체적인 정보와 예시를 포함하되, 문단당 공백 제외 약 ${perParagraph.toLocaleString('ko-KR')}자로 쓰고 4개 문단 합계가 공백 제외 ${lower.toLocaleString('ko-KR')}~${upper.toLocaleString('ko-KR')}자가 되도록 하세요. 분량을 채우려고 같은 내용을 반복하지 마세요.`,
  }
}

/** 모델이 학습 시점의 과거 연도(2023·2024년 등)를 "올해"처럼 쓰는 것을 막는 지침(루트 CLAUDE.md 핵심 원칙 8번). */
export function buildYearRule(currentYear: number): string {
  return `[기준 연도 엄수]: 현재 연도는 ${currentYear}년입니다. 모든 연도 표기·정책·지원금·트렌드·정보·제목은 반드시 ${currentYear}년(당해 연도)을 기준으로 작성하세요. 과거 연도(2023년, 2024년 등)로 퇴행하지 마세요. 단, 출시·발표·시행·사건처럼 실제로 있었던 과거 사실의 연도는 정확히 그대로 쓰고 올해로 바꾸지 마세요.`
}
