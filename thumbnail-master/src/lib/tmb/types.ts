export type Audience = "teens" | "adults" | "seniors" | "all";
export type SubjectType = "person" | "animal" | "object" | "none";
export type Gender = "auto" | "male" | "female";
export type BorderStyle = "none" | "solid" | "neon" | "sketch";
export type Size = "1K" | "2K";
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
}

export interface Inputs {
  topic: string;
  audience: Audience;
  subject: Subject;
  style: Style;
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
  style: { border: "none", channelName: "", withText: true, size: "2K" },
};
export const EMPTY_DOC: ProjectDoc = { inputs: EMPTY_INPUTS, strategy: null };

export const MAX_VERSIONS = 5;
export const MAX_PROJECTS = 30;
