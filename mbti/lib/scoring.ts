import { QUESTIONS, type Dimension } from "./questions";

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

/** 지표별 5문항 합산(5~25점)을 바탕으로 4글자 유형과 각 지표의 강도(%)를 계산한다. */
export function scoreAnswers(answers: Answers): ScoringResult {
  const sums: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };

  for (const q of QUESTIONS) {
    sums[q.dimension] += answers[q.id] ?? 3;
  }

  const dimensions: DimensionResult[] = (Object.keys(sums) as Dimension[]).map((dimension) => {
    const sum = sums[dimension];
    // 5문항 x 1~5점 = 5~25점, 중간값 15점 기준으로 극을 결정한다.
    const [lowLetter, highLetter] = DIMENSION_LETTERS[dimension];
    const isHigh = sum >= 15;
    const letter = isHigh ? highLetter : lowLetter;
    // 0~100 스케일로 정규화한 뒤, 결정된 쪽 극 기준 강도로 변환한다.
    const percentHigh = Math.round(((sum - 5) / 20) * 100);
    const strength = isHigh ? percentHigh : 100 - percentHigh;
    return { dimension, letter, strength: Math.max(50, Math.min(100, strength)) };
  });

  const type = dimensions.map((d) => d.letter).join("");

  return { type, dimensions };
}
