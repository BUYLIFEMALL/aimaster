import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "@/lib/ai";
import { UserError } from "@/lib/errors";

// AI 배경 이미지: 회원 본인 Gemini 키로 생성 → 비공개 버킷(shorts-onestop-studio)의 회원 폴더에 저장 → 임시 서명 주소로 보여 준다.
// Cloudinary 대행 생성은 쓰지 않는다(CLAUDE.md, PLATFORM_PATTERNS §12). 모델 ID는 이 저장소 다른 프로그램에서 쓰는 값.
export const BUCKET = "shorts-onestop-studio";
export const IMAGE_MODELS = [
  { id: "gemini-2.5-flash-image", name: "Nano Banana · 가벼운 모델 (기본)" },
  { id: "gemini-3.1-flash-image", name: "Nano Banana 2 · 균형형" },
] as const;
export const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0].id;
export const isImageModel = (v: unknown): v is string => IMAGE_MODELS.some((m) => m.id === v);
const MAX_IMAGES_PER_USER = 300;

export async function generateSceneImage(apiKey: string, model: string, prompt: string): Promise<{ bytes: Buffer; mimeType: string }> {
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, cache: "no-store", signal: AbortSignal.timeout(150_000),
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "9:16" } } }),
    });
  } catch { throw new AiError(504, "timeout", "이미지 생성이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요."); }
  if (res.status === 401 || res.status === 403) throw new AiError(400, "key", "본인 Gemini API 키와 이미지 모델 사용 권한을 확인해 주세요.");
  if (res.status === 429) throw new AiError(429, "quota", "본인 Gemini 계정의 사용 한도·결제 설정을 확인해 주세요.");
  if (res.status === 404) throw new AiError(422, "model", "선택한 이미지 모델을 쓸 수 없습니다. 다른 이미지 모델을 골라 주세요.");
  if (!res.ok) throw new AiError(502, "provider", "이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
  const data = await res.json();
  const cand = data?.candidates?.[0];
  if (data?.promptFeedback?.blockReason || ["SAFETY", "IMAGE_SAFETY", "PROHIBITED_CONTENT", "IMAGE_OTHER"].includes(cand?.finishReason)) throw new AiError(422, "safety", "AI가 이 이미지 요청을 처리하지 않았습니다. 장면 설명을 바꿔 주세요.");
  const img = (cand?.content?.parts ?? []).find((p: { inlineData?: { data?: string; mimeType?: string }; thought?: boolean }) => p.inlineData?.data && !p.thought)?.inlineData;
  if (!img || !/^image\/(png|jpeg|webp)$/.test(img.mimeType)) throw new AiError(502, "noimage", "AI가 이미지를 돌려주지 않았습니다. 다시 시도해 주세요.");
  return { bytes: Buffer.from(img.data, "base64"), mimeType: img.mimeType };
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
