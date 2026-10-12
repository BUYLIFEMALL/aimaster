// 시네마틱 스토리보드 자동화 공용 타입·상수 (참고 원본의 흐름을 분석해 새로 정의)
export type Lang = "ko" | "en";

/** 렌더링 엔진: 표준(빠름) / Pro(고화질, 본인 Google 계정에 결제 연결 필요) */
export type EngineId = "standard" | "pro";
export const ENGINES: Record<EngineId, { model: string; imageSize?: string; label: string }> = {
  standard: { model: "gemini-2.5-flash-image", label: "Nano Banana" },
  pro: { model: "gemini-3-pro-image-preview", imageSize: "2K", label: "Nano Banana Pro" },
};
export const TEXT_MODEL = "gemini-2.5-flash";

export type DialogueMode = "none" | "ko" | "en";
export const DURATION_OPTIONS = [
  { seconds: 5, label: "5s" },
  { seconds: 8, label: "8s (Veo 3.1)" },
  { seconds: 10, label: "10s (Sora 2)" },
  { seconds: 15, label: "15s (Sora 2)" },
] as const;
export const KEYFRAME_COUNT = 9;

export interface Keyframe {
  number: string;
  duration: string;
  shotType: string;
  composition: string;
  action: string;
  camera: string;
  lighting: string;
  sound?: string;
}

export interface Analysis {
  sceneBreakdown: { subjects: string[]; environment: string; visualAnchors: string[] };
  story: { theme: string; logline: string; emotionalArc: string[] };
  cinematicApproach: { shotProgression: string; cameraMovement: string; lensAndExposure: string; lightAndColor: string };
  keyframes: Keyframe[];
}

export interface VideoScene {
  id: string;
  duration: string;
  shotType: string;
  prompt: string;
  dialogue?: string;
}
export interface VideoPrompts {
  masterPrompt: { style: string; character: string; environment: string };
  scenes: VideoScene[];
  meta: { totalDuration: string; totalScenes: number; aspectRatio: string };
}

export type ProjectStatus = "created" | "analyzed" | "rendered" | "prompts";

export const LIMITS = { topic: 300, title: 80, maxProjects: 30, maxImageBytes: 6 * 1024 * 1024 } as const;
