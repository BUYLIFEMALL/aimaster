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

/** v1.18: 목록 배지와 같은 계산(절감률 반올림)으로 「용량이 늘어난 그림」인지 */
export function isGrownFile(original: number, converted: number): boolean {
  if (!(original > 0)) return false;
  return savingGrade(Math.round((1 - converted / original) * 100)) === "bigger";
}

/** v1.18: 「WebP로 다시 변환」 설정 — 형식 WebP, 품질은 지금 값과 80% 중 낮은 쪽(화면 설정은 그대로) */
export function shrinkRetryOptions(quality: number): { format: "webp"; quality: number } {
  return { format: "webp", quality: Math.min(Number.isFinite(quality) ? quality : 0.8, 0.8) };
}

export type RetryOutcome = "smaller" | "stillBigger" | "noGain";
/** v1.18: 다시 변환 결과 판정 — 이전 결과보다 작아야 바꾼다. 작아졌어도 원본보다 크면 stillBigger */
export function retryOutcome(original: number, previous: number, retried: number): RetryOutcome {
  if (!(retried < previous)) return "noGain";
  return isGrownFile(original, retried) ? "stillBigger" : "smaller";
}

/** v1.18: 「모두 다시 변환」 결과 세기 */
export function countRetry(outcomes: (RetryOutcome | "error")[]): { total: number; smaller: number; stillBigger: number; noGain: number; failed: number } {
  const n = (k: RetryOutcome | "error") => outcomes.filter((o) => o === k).length;
  return { total: outcomes.length, smaller: n("smaller"), stillBigger: n("stillBigger"), noGain: n("noGain"), failed: n("error") };
}
