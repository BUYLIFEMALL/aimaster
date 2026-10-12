// Veo(Gemini API) 요청 만들기·응답 읽기(순수 함수). 규격은 ai.google.dev/gemini-api/docs/veo 의 REST 예시를 따른다.
//  - 시작: POST {BASE}/models/{model}:predictLongRunning  → { name: "models/…/operations/…" }
//  - 확인: GET {BASE}/{name}                                → { done, response.generateVideoResponse.generatedSamples[0].video.uri }
//  - 내려받기: GET {uri} + x-goog-api-key 헤더(리다이렉트 따라감)
import { VEO_MODELS, VIDEO_LENGTHS, type AspectRatioId, type VeoModelId, type VideoLength } from "./presets";

export const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface VeoImage {
  mimeType: string;
  /** base64 (data: 접두사 없이) */
  data: string;
}

export function buildVeoRequest(params: {
  model: VeoModelId;
  prompt: string;
  ratio: AspectRatioId;
  length: VideoLength;
  loop: boolean;
  image?: VeoImage;
}): { url: string; body: Record<string, unknown> } {
  const instance: Record<string, unknown> = { prompt: params.prompt };
  if (params.image) {
    instance.image = { inlineData: { mimeType: params.image.mimeType, data: params.image.data } };
    // 심리스 루프: 마지막 프레임을 첫 프레임과 같은 이미지로 지정한다(이미지가 있을 때만 가능).
    if (params.loop) instance.lastFrame = { inlineData: { mimeType: params.image.mimeType, data: params.image.data } };
  }
  return {
    url: `${GEMINI_BASE}/models/${params.model}:predictLongRunning`,
    body: {
      instances: [instance],
      // 첫·마지막 프레임을 지정하는 요청은 8초로 고정한다(문서 제약 보수적 적용).
      parameters: { aspectRatio: params.ratio, durationSeconds: params.loop && params.image ? 8 : params.length },
    },
  };
}

/** 루프(첫·마지막 프레임 지정)를 쓰면 길이가 8초로 고정되는지 */
export function effectiveLength(length: VideoLength, loop: boolean, hasImage: boolean): VideoLength {
  return loop && hasImage ? 8 : length;
}

export function parseOperationStart(data: unknown): string | null {
  const name = (data as { name?: unknown } | null)?.name;
  return typeof name === "string" && /^models\/[\w.\-]+\/operations\/[\w\-]+$/.test(name) ? name : null;
}

export type OperationStatus =
  | { state: "running" }
  | { state: "done"; videoUri: string }
  | { state: "failed"; message: string };

export function parseOperationStatus(data: unknown): OperationStatus {
  const d = (data ?? {}) as {
    done?: boolean;
    error?: { message?: string };
    response?: { generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[]; raiMediaFilteredReasons?: string[] } };
  };
  if (!d.done) return { state: "running" };
  if (d.error) return { state: "failed", message: "영상 생성에 실패했습니다. 잠시 뒤 다시 시도해주세요." };
  const res = d.response?.generateVideoResponse;
  const uri = res?.generatedSamples?.[0]?.video?.uri;
  if (typeof uri === "string" && isAllowedVideoUri(uri)) return { state: "done", videoUri: uri };
  if (res?.raiMediaFilteredReasons?.length) return { state: "failed", message: "안전 정책에 걸려 영상을 만들지 못했습니다. 장면 묘사를 바꿔 다시 시도해주세요." };
  return { state: "failed", message: "영상 결과를 찾지 못했습니다. 다시 시도해주세요." };
}

/** 내려받기 주소는 Google Generative Language API 주소만 허용한다(서버가 임의 주소를 대신 열어주지 않게). */
export function isAllowedVideoUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "https:" && u.hostname === "generativelanguage.googleapis.com" && !u.username && !u.password && u.search.length < 300;
  } catch {
    return false;
  }
}

export function isAllowedOperationName(name: string): boolean {
  return /^models\/[\w.\-]+\/operations\/[\w\-]+$/.test(name);
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
  const per = VEO_MODELS.find((m) => m.value === model)?.usdPerSecond ?? 0.4;
  const usd = Math.round(per * seconds * count * 100) / 100;
  return { usd, krw: Math.round((usd * KRW_PER_USD) / 10) * 10 };
}
