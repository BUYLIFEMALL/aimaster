import "server-only";
import sharp from "sharp";
import { IMAGE_MODEL, type AspectRatioId } from "@/lib/music/presets";
import type { VeoImage } from "@/lib/music/veo";

/** Gemini/Veo 호출 오류를 키가 들어가지 않는 한국어 안내문으로 바꾼다. */
export function geminiErrorMessage(status: number, what: string): string {
  if (status === 401 || status === 403) return `Gemini API 키가 올바르지 않거나 ${what} 권한이 없습니다. 본인 키와 결제 설정을 확인해주세요.`;
  if (status === 404) return `이 Gemini 계정에서 ${what} 모델을 사용할 수 없습니다. 다른 모델을 선택해 보세요.`;
  if (status === 429) return "Gemini API 사용 한도나 분당 요청 한도에 도달했습니다. 잠시 뒤 다시 시도하거나 계정의 한도·결제를 확인해주세요.";
  if (status === 400) return `${what} 요청이 거절되었습니다. 결제가 활성화된 프로젝트의 키인지, 장면 묘사에 문제가 없는지 확인해주세요.`;
  return `${what}에 실패했습니다. (Gemini ${status})`;
}

/** 장면 이미지 1장. 참고 이미지(최대 3장)가 있으면 함께 보내 분위기·인물 외형을 따르게 한다. 결과는 JPEG로 줄여 돌려준다. */
export async function generateSceneImage(params: { apiKey: string; prompt: string; ratio: AspectRatioId; references: VeoImage[] }): Promise<{ mimeType: string; data: string }> {
  const parts: unknown[] = [{ text: params.prompt }];
  for (const ref of params.references) parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${IMAGE_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": params.apiKey },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["Image"], imageConfig: { aspectRatio: params.ratio, imageSize: "1K" }, temperature: 0.7 },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(110_000),
  });
  if (!response.ok) throw new Error(geminiErrorMessage(response.status, "이미지 생성"));
  const data = (await response.json()) as { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] };
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error("응답에 이미지가 없습니다. 안전 정책에 걸렸을 수 있으니 장면 묘사를 바꿔 다시 시도해주세요.");
  const jpeg = await sharp(Buffer.from(part.inlineData.data.replace(/\s+/g, ""), "base64")).jpeg({ quality: 88 }).toBuffer();
  return { mimeType: "image/jpeg", data: jpeg.toString("base64") };
}
