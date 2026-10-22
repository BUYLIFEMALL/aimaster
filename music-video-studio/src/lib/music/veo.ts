// 장면 영상 옵션 검사·비용 계산(순수 함수). 실제 호출은 공용 기준 코드 ai-video-providers(@/lib/video/videoProviders).
// 2026-10-23 v1.12: Veo 3.1 Preview(Gemini API) 종료로 Veo 요청·응답 코드를 지우고 Gemini Omni Flash로 바꿨다.
import { VEO_MODELS, VIDEO_LENGTHS, type VeoModelId, type VideoLength } from "./presets";

export interface VeoImage {
  mimeType: string;
  /** base64 (data: 접두사 없이) */
  data: string;
}

/** 영상 길이. Omni Flash는 길이 칸이 없어 프롬프트로 안내하며, 루프(첫·끝 프레임)도 고른 길이를 그대로 쓴다. */
export function effectiveLength(length: VideoLength, _loop: boolean, _hasImage: boolean): VideoLength {
  return length;
}

export function isVeoModel(value: unknown): value is VeoModelId {
  return VEO_MODELS.some((m) => m.value === value);
}

export function isVideoLength(value: unknown): value is VideoLength {
  return (VIDEO_LENGTHS as readonly number[]).includes(value as number);
}

export const KRW_PER_USD = 1400;

/** 예상 비용(USD·원). 요금표는 바뀔 수 있어 화면에서는 "약"으로 안내한다. */
export function estimateCost(model: VeoModelId, seconds: number, count = 1): { usd: number; krw: number } {
  const per = VEO_MODELS.find((m) => m.value === model)?.usdPerSecond ?? 0.1;
  const usd = Math.round(per * seconds * count * 100) / 100;
  return { usd, krw: Math.round((usd * KRW_PER_USD) / 10) * 10 };
}
