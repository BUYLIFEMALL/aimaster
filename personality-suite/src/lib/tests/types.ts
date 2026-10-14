// AI 종합 성격 진단 — 검사 공통 타입(서버·클라이언트 공용, 비밀 값 없음).
// 모든 문항·해석 문구는 이 프로그램에서 새로 작성한 콘텐츠다(원본 앱·공식 검사의 문장을 쓰지 않는다).

export type TestKind = "type16" | "bigfive" | "behavior" | "attachment" | "enneagram";
export type TestGroup = "type16" | "psych";

/** 5단계 동의 척도(1~5). 모든 검사가 같은 척도를 쓴다. */
export const SCALE = [
  { value: 1, label: "전혀 그렇지 않다" },
  { value: 2, label: "그렇지 않은 편이다" },
  { value: 3, label: "보통이다" },
  { value: 4, label: "그런 편이다" },
  { value: 5, label: "매우 그렇다" },
] as const;

export type Axis = "EI" | "SN" | "TF" | "JP";
export type Pole = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";
export const AXES: Axis[] = ["EI", "SN", "TF", "JP"];
/** 축의 앞 극(점수가 +일 때)과 뒤 극 */
export const AXIS_POLES: Record<Axis, [Pole, Pole]> = { EI: ["E", "I"], SN: ["S", "N"], TF: ["T", "F"], JP: ["J", "P"] };

export interface Type16Question { text: string; axis: Axis; pole: Pole }
export interface TraitQuestion { text: string; trait: string; reverse?: boolean }

interface Base {
  id: string;
  group: TestGroup;
  title: string;
  description: string;
  /** 카드에 보여 줄 한 줄 소개(어떤 상황의 나를 보는지) */
  tagline: string;
  minutes: number;
}

export interface Type16Test extends Base {
  kind: "type16";
  questions: Type16Question[];
  /** 극별 상황 해석 한 문장(8개) — 유형 4글자에 맞춰 이어 붙인다 */
  lens: Record<Pole, string>;
  lensTitle: string;
}

export interface BigFiveTest extends Base { kind: "bigfive"; questions: TraitQuestion[] }
export interface BehaviorTest extends Base { kind: "behavior"; questions: TraitQuestion[] }
export interface AttachmentTest extends Base { kind: "attachment"; questions: TraitQuestion[] }
export interface EnneagramTest extends Base { kind: "enneagram"; questions: TraitQuestion[] }

export type Test = Type16Test | BigFiveTest | BehaviorTest | AttachmentTest | EnneagramTest;

// ---- 결과 ----
export interface AxisScore {
  axis: Axis;
  /** 앞 극 쪽 비율(0~100). 50이면 중립 */
  firstPct: number;
  poles: [Pole, Pole];
  chosen: Pole;
  /** 두 극이 거의 비슷한 경계 */
  borderline: boolean;
}

export interface TraitScore { key: string; label: string; score: number; level?: "low" | "mid" | "high" }

export interface ScoredResult {
  testId: string;
  kind: TestKind;
  /** 대표 결과 이름(예: "INFP", "개방성", "주도형") — 목록·AI 분석에 쓴다 */
  headline: string;
  /** type16: 4글자 유형, 그 외: 코드(예: "D", "anxious") */
  code: string;
  axes?: AxisScore[];
  traits?: TraitScore[];
  /** 에니어그램 등 순위가 필요한 검사의 상위 결과 코드 */
  ranking?: string[];
  /** 점수가 비슷해 두 결과를 함께 읽어야 하는 경우 */
  close?: boolean;
}

export const ANSWER_MIN = 1;
export const ANSWER_MAX = 5;
