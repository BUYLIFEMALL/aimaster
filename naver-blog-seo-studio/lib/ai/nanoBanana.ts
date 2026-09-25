import "server-only";
import { getNanoBananaConfig } from "./nanoBananaConfig";

export interface GeneratedImage { base64: string; mimeType: string; model: string; }

function describeGeminiFailure(status: number, payload: unknown) {
  const providerMessage = typeof payload === "object" && payload !== null
    && "error" in payload
    && typeof payload.error === "object" && payload.error !== null
    && "message" in payload.error
    && typeof payload.error.message === "string"
    ? payload.error.message.trim()
    : "";
  // Gemini normally does not return the supplied key, but keep error output safe
  // before it is returned to the extension UI.
  const safeMessage = providerMessage
    .replace(/AIza[\w-]{20,}/g, "[API 키 숨김]")
    .replace(/\s+/g, " ")
    .slice(0, 400);
  return safeMessage
    ? `나노바나나 이미지 생성에 실패했습니다. (${status}: ${safeMessage})`
    : `나노바나나 이미지 생성에 실패했습니다. (${status})`;
}

export async function generateNanoBananaImage(params: { apiKey: string; topic: string; title?: string; keywords?: string; model?: string }): Promise<GeneratedImage> {
  const config = getNanoBananaConfig(params.model ?? "nanobanana-2-2k");
  const prompt = `Create one photorealistic editorial image for a Korean Naver blog post. Topic: ${params.topic}. Title: ${params.title || "not specified"}. Keywords: ${params.keywords || "none"}. Depict realistic Korean/East Asian people by default unless the topic explicitly requires another setting. Use one unified scene, not a collage or split screen. Natural lighting, documentary-quality composition, 16:9 landscape, no visible text, no logo, no watermark.`;
  const response = await fetch(`${config.endpoint}?key=${params.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["Image"], imageConfig: { aspectRatio: "16:9", imageSize: config.imageSize }, temperature: config.temperature } }),
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(describeGeminiFailure(response.status, errorPayload));
  }
  const data = await response.json() as { candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[] };
  const imagePart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
  if (!imagePart?.data) throw new Error("나노바나나가 이미지 결과를 반환하지 않았습니다.");
  return { base64: imagePart.data.replace(/\s+/g, ""), mimeType: imagePart.mimeType ?? "image/png", model: config.modelName };
}
