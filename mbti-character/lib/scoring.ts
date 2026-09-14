import type { Dimension, Question } from "./questions";

/** 문항 id → 1~5점 응답. */
export type Answers = Record<number, number>;

const DIMENSION_LETTERS: Record<Dimension, [string, string]> = {
  EI: ["I", "E"],
  SN: ["S", "N"],
  TF: ["T", "F"],
  JP: ["J", "P"],
};

export interface DimensionResult {
  dimension: Dimension;
  letter: string;
  /** 결정된 letter 쪽으로 얼마나 강하게 기울었는지 (50~100). */
  strength: number;
}

export interface ScoringResult {
  type: string; // 예: "INFP"
  dimensions: DimensionResult[];
}

/**
 * 지표별 문항 합산을 바탕으로 4글자 유형과 각 지표의 강도(%)를 계산한다. 문항 수에서
 * 최소/최대 점수 범위를 동적으로 계산해두면, 나중에 문항 구성이 바뀌어도 그대로 재사용할
 * 수 있다.
 */
export function scoreAnswers(questions: Question[], answers: Answers): ScoringResult {
  const sums: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
  const counts: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };

  for (const q of questions) {
    sums[q.dimension] += answers[q.id] ?? 3;
    counts[q.dimension] += 1;
  }

  const dimensions: DimensionResult[] = (Object.keys(sums) as Dimension[]).map((dimension) => {
    const sum = sums[dimension];
    const count = counts[dimension];
    const min = count; // 문항당 최저 1점
    const max = count * 5; // 문항당 최고 5점
    const mid = (min + max) / 2;

    const [lowLetter, highLetter] = DIMENSION_LETTERS[dimension];
    const isHigh = sum >= mid;
    const letter = isHigh ? highLetter : lowLetter;
    // 0~100 스케일로 정규화한 뒤, 결정된 쪽 극 기준 강도로 변환한다.
    const percentHigh = Math.round(((sum - min) / (max - min)) * 100);
    const strength = isHigh ? percentHigh : 100 - percentHigh;
    return { dimension, letter, strength: Math.max(50, Math.min(100, strength)) };
  });

  const type = dimensions.map((d) => d.letter).join("");

  return { type, dimensions };
}
