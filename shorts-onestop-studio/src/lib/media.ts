// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image·경량 1K는 gemini-3.1-flash-lite-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "@/lib/ai";
import { UserError } from "@/lib/errors";
import { GeminiImageError, generateGeminiImage } from "./geminiImage";
import { NANO_BANANA_MODEL_CONFIGS } from "./nanoBananaModels";

// AI 배경 이미지: 회원 본인 Gemini 키로 생성 → 비공개 버킷(shorts-onestop-studio)의 회원 폴더에 저장 → 임시 서명 주소로 보여 준다.
// Cloudinary 대행 생성은 쓰지 않는다(CLAUDE.md, PLATFORM_PATTERNS §12). 모델 ID는 이 저장소 다른 프로그램에서 쓰는 값.
export const BUCKET = "shorts-onestop-studio";
// 2026-10-17: 이미지 모델 이름은 공용 기준 코드 gemini-image-models(./nanoBananaModels — 기준은 ai-image-studio)의 1K·2K 등급에서 가져온다(주인님 지시로 통합).
export const IMAGE_MODELS = [
  { id: NANO_BANANA_MODEL_CONFIGS.nanobanana.modelName, name: "Nano Banana · 가벼운 모델 (기본)" },
  { id: NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"].modelName, name: "Nano Banana 2 · 균형형" },
] as const;
export const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0].id;
export const isImageModel = (v: unknown): v is string => IMAGE_MODELS.some((m) => m.id === v);
const MAX_IMAGES_PER_USER = 300;

export async function generateSceneImage(apiKey: string, model: string, prompt: string): Promise<{ bytes: Buffer; mimeType: string }> {
  // 2026-10-17: 호출·대기·최종 이미지 받아오기(중간 초안 thought 조각 제외)·안전 차단 판별은 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio).
  // 150초 제한은 그대로이고, 재시도하면 함수 한도(300초)를 넘으므로 원래처럼 재시도 없음(retries: 0). 프롬프트·9:16 비율·오류 문구는 그대로.
  let out: { base64: string; mimeType: string };
  try {
    out = await generateGeminiImage({ apiKey, modelName: model, prompt, aspectRatio: "9:16", responseModalities: ["TEXT", "IMAGE"], timeoutMs: 150_000, retries: 0 });
  } catch (e) {
    if (!(e instanceof GeminiImageError)) throw e;
    if (e.code === "TIMEOUT" || e.code === "NETWORK") throw new AiError(504, "timeout", "이미지 생성 응답을 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.");
    if (e.code === "SAFETY_BLOCKED") throw new AiError(422, "safety", "AI가 이 이미지 요청을 처리하지 않았습니다. 장면 설명을 바꿔 주세요.");
    if (e.code === "NO_IMAGE") throw new AiError(502, "noimage", "AI가 이미지를 돌려주지 않았습니다. 다시 시도해 주세요.");
    if (e.status === 401 || e.status === 403) throw new AiError(400, "key", "본인 Gemini API 키와 이미지 모델 사용 권한을 확인해 주세요.");
    if (e.status === 429) throw new AiError(429, "quota", "본인 Gemini 계정의 사용 한도·결제 설정을 확인해 주세요.");
    if (e.status === 404) throw new AiError(422, "model", "선택한 이미지 모델을 쓸 수 없습니다. 다른 이미지 모델을 골라 주세요.");
    throw new AiError(502, "provider", "이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!/^image\/(png|jpeg|webp)$/.test(out.mimeType)) throw new AiError(502, "noimage", "AI가 이미지를 돌려주지 않았습니다. 다시 시도해 주세요.");
  return { bytes: Buffer.from(out.base64, "base64"), mimeType: out.mimeType };
}

export async function saveSceneImage(userId: string, img: { bytes: Buffer; mimeType: string }): Promise<string> {
  const admin = createAdminClient();
  const { data: list } = await admin.storage.from(BUCKET).list(userId, { limit: MAX_IMAGES_PER_USER + 1 });
  if ((list?.length ?? 0) >= MAX_IMAGES_PER_USER) throw new UserError(400, `AI 배경 이미지는 ${MAX_IMAGES_PER_USER}장까지 보관할 수 있습니다. 쓰지 않는 대본을 정리해 주세요.`);
  const ext = img.mimeType === "image/png" ? "png" : img.mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${randomUUID()}.${ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, img.bytes, { contentType: img.mimeType, upsert: false });
  if (error) throw new UserError(500, "이미지를 저장하지 못했습니다.");
  return path;
}

/** 본인 폴더 경로만 1시간 서명 주소로 바꾼다(다른 회원 경로는 무시) */
export async function signPaths(userId: string, paths: string[]): Promise<Record<string, string>> {
  const own = Array.from(new Set(paths.filter((p) => typeof p === "string" && p.startsWith(`${userId}/`) && !p.includes("..")))).slice(0, 60);
  if (!own.length) return {};
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrls(own, 3600);
  const out: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}
