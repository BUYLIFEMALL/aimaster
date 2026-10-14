import { ASPECTS, RESOLUTIONS, RETOUCH_KEYS } from "./options";
import type { AspectRatio, ModelLevel, Resolution, Retouch } from "./options";
import type { PromptInput } from "./prompt";

// 생성 요청 검증(순수 함수). 서버는 이 결과만 믿고 프롬프트를 만든다.

/** Vercel 본문 한도(4.5MB)를 넘지 않도록 base64 3.2M자(약 2.4MB 이미지)까지만 받는다 */
export const MAX_IMAGE_B64 = 3_200_000;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

export interface GenerateRequest {
  image: { data: string; mimeType: string };
  model: ModelLevel;
  resolution: Resolution;
  aspect: AspectRatio;
  prompt: PromptInput;
}

export type ParseOutcome = { ok: true; value: GenerateRequest } | { ok: false; error: string };

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;

export function parseGenerateRequest(body: Record<string, unknown>): ParseOutcome {
  const img = body.image as { data?: unknown; mimeType?: unknown } | undefined;
  if (!img || typeof img.data !== "string" || typeof img.mimeType !== "string") return { ok: false, error: "사진이 없습니다. 인물 사진을 먼저 올려 주세요." };
  if (!(ALLOWED_MIME as readonly string[]).includes(img.mimeType)) return { ok: false, error: "PNG, JPG, WEBP 사진만 사용할 수 있습니다." };
  if (img.data.length > MAX_IMAGE_B64) return { ok: false, error: "사진이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요." };
  if (img.data.length < 100 || !B64.test(img.data)) return { ok: false, error: "사진 데이터가 올바르지 않습니다." };

  const model = body.model;
  if (model !== "flash" && model !== "pro") return { ok: false, error: "모델 선택이 올바르지 않습니다." };
  const resolution = body.resolution;
  if (typeof resolution !== "string" || !(RESOLUTIONS as string[]).includes(resolution)) return { ok: false, error: "해상도 선택이 올바르지 않습니다." };
  const aspect = body.aspect;
  if (typeof aspect !== "string" || !ASPECTS.some((a) => a.value === aspect)) return { ok: false, error: "이미지 비율 선택이 올바르지 않습니다." };

  const p = body.options as Record<string, unknown> | undefined;
  if (!p || typeof p !== "object") return { ok: false, error: "촬영 옵션이 없습니다." };
  const ids = ["lightingId", "cameraId", "poseId", "outfitId", "filmId", "colorId", "backgroundId"] as const;
  for (const k of ids) if (!isStr(p[k])) return { ok: false, error: "촬영 옵션이 올바르지 않습니다." };
  if (!Array.isArray(p.skinIds) || p.skinIds.length > 10 || !p.skinIds.every(isStr)) return { ok: false, error: "피부 질감 선택이 올바르지 않습니다." };
  const r = p.retouch as Record<string, unknown> | undefined;
  if (!r || typeof r !== "object") return { ok: false, error: "보정 옵션이 올바르지 않습니다." };
  const retouch = {} as Retouch;
  for (const k of RETOUCH_KEYS) {
    if (typeof r[k] !== "boolean") return { ok: false, error: "보정 옵션이 올바르지 않습니다." };
    retouch[k] = r[k] as boolean;
  }
  if (typeof p.truePerspective !== "boolean" || typeof p.symmetry !== "boolean") return { ok: false, error: "촬영 옵션이 올바르지 않습니다." };

  return {
    ok: true,
    value: {
      image: { data: img.data, mimeType: img.mimeType },
      model,
      resolution: resolution as Resolution,
      aspect: aspect as AspectRatio,
      prompt: {
        lightingId: p.lightingId as string, cameraId: p.cameraId as string, poseId: p.poseId as string,
        outfitId: p.outfitId as string, filmId: p.filmId as string, colorId: p.colorId as string,
        backgroundId: p.backgroundId as string, skinIds: p.skinIds as string[], retouch,
        truePerspective: p.truePerspective, symmetry: p.symmetry,
      },
    },
  };
}
