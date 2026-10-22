// v1.18: 비교 창 「원본 → 변환 용량(±%)」 — 순수 함수(시험 대상)

/** 용량 변화 비율(%) 문자열. 줄면 "−72%", 늘면 "+15%", 같으면 "±0%". 원본이 0이면 null */
export function sizeChangeLabel(original: number, converted: number): string | null {
  if (!(original > 0) || !(converted >= 0)) return null;
  const pct = Math.round(((converted - original) / original) * 100);
  if (pct === 0) return "±0%";
  return pct < 0 ? `\u2212${Math.abs(pct)}%` : `+${pct}%`;
}

export type SavingGrade = "great" | "small" | "bigger";
/** v1.18: 목록 배지 등급 — 30% 이상 줄면 great(초록), 0~29% small(회색), 늘면 bigger(주황). ratio는 절감률(%) */
export function savingGrade(ratio: number): SavingGrade {
  if (ratio < 0) return "bigger";
  return ratio >= 30 ? "great" : "small";
}
