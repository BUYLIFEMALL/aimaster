// 2026-10-21 병합 B: 페르소나 문체 자동화(persona-style-studio)에서 옮김.
// 페르소나 문체 자동화 공용 타입 (참고 원본의 구조를 분석해 새로 만든 정의)
export type Lang = "ko" | "en";

export const EQ_KEYS = ["creativity", "clarity", "emotionalDepth", "length", "professionalism"] as const;
export type EqKey = (typeof EQ_KEYS)[number];
export type EqValues = Record<EqKey, number>;

export interface PersonaContext {
  lore: string; // 세계관/배경
  voice: string; // 말투/성격
  style: string; // 문체/스타일
}

export interface Persona {
  id: string; // 기본 페르소나는 "persona-…", 직접 만든 것은 "custom-…"
  name: string;
  role: string;
  description: string;
  avatar: string;
  context: PersonaContext;
  values: EqValues;
}

export interface EqPreset {
  id: string;
  name: string;
  description: string;
  values: EqValues;
}

export const DEFAULT_VALUES: EqValues = { creativity: 85, clarity: 42, emotionalDepth: 76, length: 60, professionalism: 30 };

export const LIMITS = { text: 8000, field: 2000, name: 40, role: 60, description: 200 } as const;

export const EQ_LABELS: Record<Lang, Record<EqKey, string>> = {
  ko: { creativity: "창의성", clarity: "명확성", emotionalDepth: "감정 깊이", length: "길이", professionalism: "전문성" },
  en: { creativity: "CREATIVITY", clarity: "CLARITY", emotionalDepth: "EMOTIONAL DEPTH", length: "LENGTH", professionalism: "PROFESSIONALISM" },
};
