// 2026-10-23 (v1.92 후보): 글 분량을 AI가 지킬 수 있는 「개수」로 바꾼다.
// 「약 N단어」·「문단마다 875자 이상」은 AI가 세며 쓸 수 없어 GPT-4.1도 목표의 약 60%만 썼다(글 20번).
// 목표 글자 수(단어×3.5, 없으면 2,000자)를 문단 4개로 나누고, 단락 1개(3~4문장) ≈ 250자로 문단마다 단락 수를 정한다.
export const SECTION_COUNT = 4
export const CHARS_PER_UNIT = 250

export function lengthPlan(wordCount?: number) {
  const totalChars = wordCount && wordCount > 0 ? Math.round(wordCount * 3.5) : 2000
  const perSection = Math.max(500, Math.round(totalChars / SECTION_COUNT))
  const unitsPerSection = Math.max(2, Math.round(perSection / CHARS_PER_UNIT))
  return { totalChars: perSection * SECTION_COUNT, perSection, unitsPerSection }
}
