// AI 영상 스튜디오 — 공급자·모델 목록(화면과 서버 공용, 서버 전용 코드 없음).
// 모델·단가·길이는 공용 기준 코드 ai-video-models(@/lib/video/videoModels — 이 프로그램이 기준)에서 그대로 가져온다.
// 여기서는 화면에 필요한 공급자 설명·키 이름과 「이 모델이 무엇을 받는지」만 덧붙인다.
import { VIDEO_MODELS, findVideoModel, sceneCost, type VideoModel, type VideoProvider } from "@/lib/video/videoModels";

export type ProviderId = VideoProvider;
export type AspectRatio = "16:9" | "9:16";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  keyProvider: string;
  keyLabel: string;
  keyLink: string;
  placeholder: string;
  description: string;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    keyProvider: "gemini",
    keyLabel: "Google Gemini API Key",
    keyLink: "https://aistudio.google.com/app/apikey",
    placeholder: "AIzaSy...",
    description: "Gemini Omni Flash 영상(글만·사진→영상·시작/끝 장면)과 프롬프트 다듬기에 씁니다. 결제가 연결된(유료 등급) 키가 필요합니다.",
  },
  fal: {
    id: "fal",
    name: "fal",
    keyProvider: "fal",
    keyLabel: "fal API Key",
    keyLink: "https://fal.ai/dashboard/keys",
    placeholder: "xxxxxxxx-xxxx-...:xxxxxxxx",
    description: "Kling·Seedance 등 여러 영상 모델을 키 하나로 씁니다. fal 계정에 크레딧을 충전해야 합니다.",
  },
  replicate: {
    id: "replicate",
    name: "Replicate",
    keyProvider: "replicate",
    keyLabel: "Replicate API Token",
    keyLink: "https://replicate.com/account/api-tokens",
    placeholder: "r8_...",
    description: "Seedance 1 Lite·Kling v2.1 영상 모델을 씁니다. Replicate 계정에 결제 수단이 등록돼 있어야 합니다.",
  },
};

export interface StudioModel extends VideoModel {
  /** 시작 장면 사진이 꼭 필요한가(Gemini만 글만으로 생성 가능) */
  needsImage: boolean;
  /** 고를 수 있는 화면 비율 — 비어 있으면 시작 사진 비율을 따른다 */
  aspects: AspectRatio[];
}

function studioOf(m: VideoModel): StudioModel {
  const aspects: AspectRatio[] = m.provider === "gemini" || m.id.includes("seedance") ? ["16:9", "9:16"] : [];
  return { ...m, needsImage: m.provider !== "gemini", aspects };
}

export const MODELS: StudioModel[] = VIDEO_MODELS.map(studioOf);

export function findModel(id: unknown): StudioModel | undefined {
  const m = findVideoModel(id);
  return m ? studioOf(m) : undefined;
}

export function clampSeconds(m: StudioModel, requested: unknown): number {
  const n = typeof requested === "number" ? requested : NaN;
  return (m.durations as readonly number[]).includes(n) ? n : m.durations[0];
}

/** 예상 비용(USD) — 화면에서는 「약」으로 안내하고 실제 청구는 회원 계정 기준 */
export function estCostUsd(m: StudioModel, seconds: number, withEnd: boolean): number {
  return Math.round(sceneCost(m, withEnd, seconds) * 100) / 100;
}
