export type Audience = "teens" | "adults" | "seniors" | "all";
export type SubjectType = "person" | "animal" | "object" | "none";
export type Gender = "auto" | "male" | "female";
export type BorderStyle = "none" | "solid" | "neon" | "sketch";
export type Size = "1K" | "2K";
/** v1.13 화면 비율 — 가로 16:9(유튜브 썸네일) / 세로 9:16(쇼츠·릴스 표지) */
export type Ratio = "16:9" | "9:16";
export type Opt = "a" | "b";
export const OPTS: Opt[] = ["a", "b"];

export interface Subject {
  type: SubjectType;
  gender: Gender;
  age: string;
  ethnicity: string;
  description: string;
}

export interface Style {
  border: BorderStyle;
  channelName: string;
  withText: boolean;
  size: Size;
  ratio: Ratio;
}

/** v1.12 참고 문서(올린 파일 또는 「SEO 전략」 대본) — 프로젝트와 함께 저장, A/B 문구를 만들 때 AI가 함께 읽음 */
export interface RefDoc { name: string; text: string; truncated: boolean }

export interface Inputs {
  topic: string;
  audience: Audience;
  subject: Subject;
  style: Style;
  doc?: RefDoc;
  /** v1.12 들어온 경로 표시(예: 「SEO 전략 A · 호기심 유발형」) */
  origin?: string;
}

export interface OptionText { label: string; main: string; sub: string; styleHint: string }

export interface Strategy {
  summary: string;
  imagePrompt: string;
  imagePromptKo: string;
  a: OptionText;
  b: OptionText;
}

export interface ImageVersion { path: string; v: number; at: string; model: string; instruction?: string }
export interface ImageSet { versions: ImageVersion[]; cur: number }
export const EMPTY_SET: ImageSet = { versions: [], cur: -1 };

export interface ProjectDoc { inputs: Inputs; strategy: Strategy | null }

export const AGES = ["10대 (Teen)", "20대 (Young Adult)", "30-40대 (Adult)", "50대 이상 (Senior)", "어린이 (Child)"] as const;
export const ETHNICITIES = ["한국인 (Korean)", "백인 (Caucasian)", "흑인 (Black/African)", "동양인 (East Asian)", "히스패닉 (Hispanic)", "다문화/판타지"] as const;

export const EMPTY_INPUTS: Inputs = {
  topic: "",
  audience: "adults",
  subject: { type: "person", gender: "auto", age: "20대 (Young Adult)", ethnicity: "한국인 (Korean)", description: "" },
  style: { border: "none", channelName: "", withText: true, size: "2K", ratio: "16:9" },
};
export const EMPTY_DOC: ProjectDoc = { inputs: EMPTY_INPUTS, strategy: null };

export const MAX_VERSIONS = 5;
export const MAX_PROJECTS = 30;
