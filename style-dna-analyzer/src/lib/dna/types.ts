import type { AiProvider } from "@/lib/ai/models";

export type DnaMode = "replicate" | "mutate";

export const MODES: { value: DnaMode; label: string; desc: string }[] = [
  { value: "replicate", label: "유전자 복제", desc: "이미지의 스타일을 그대로 재현하는 프롬프트 (피사체만 바꿔 끼우기)" },
  { value: "mutate", label: "유전자 변이", desc: "스타일 DNA는 유지하되 지침에 따라 장면·소품·분위기를 새롭게 변형" },
];

/** 소제목이 붙은 설명 한 줄 (예: 앵글/구도: …) */
export interface Fact {
  label: string;
  text: string;
}

export interface DnaResult {
  titleEn: string;
  titleKo: string;
  camera: { angle: string; shotType: string; lens: string; focusDistance: string; depthOfField: string };
  lighting: { timeOfDay: string; direction: string; altitude: string; contrast: string; shadows: string };
  dna: { label: string; score: number }[];
  /** AI가 스스로 추정한 프롬프트 재현도(0~100). 실제 측정값이 아니다. */
  matchRate: number;
  structure: Fact[];
  style: Fact[];
  tips: Fact[];
  masterPromptEn: string;
  masterPromptKo: string;
  keywords: string[];
}

export interface PaletteColor {
  hex: string;
  percent: number;
}

export interface RefineEntry {
  at: string;
  feedback: string;
  note: string;
}

export interface AnalysisRecord {
  id: string;
  title: string;
  mode: DnaMode;
  guidance: string;
  engine: { provider: AiProvider; model: string };
  imageUrl: string;
  aspectRatio: string;
  palette: PaletteColor[];
  result: DnaResult;
  history: RefineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisSummary {
  id: string;
  title: string;
  mode: DnaMode;
  imageUrl: string;
  palette: PaletteColor[];
  createdAt: string;
}

export const SUBJECT_PLACEHOLDER_EN = "[INSERT SUBJECT HERE]";
export const SUBJECT_PLACEHOLDER_KO = "[주제 입력]";

/** 지원하는 생성 비율(Gemini imageConfig.aspectRatio) */
export const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"] as const;

/** 가로·세로 크기에 가장 가까운 지원 비율 */
export function nearestAspectRatio(width: number, height: number): string {
  if (!(width > 0) || !(height > 0)) return "1:1";
  const target = width / height;
  let best = "1:1";
  let bestDiff = Infinity;
  for (const r of ASPECT_RATIOS) {
    const [w, h] = r.split(":").map(Number);
    const diff = Math.abs(Math.log(target / (w / h)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    }
  }
  return best;
}
