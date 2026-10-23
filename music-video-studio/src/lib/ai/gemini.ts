import "server-only";
import sharp from "sharp";
import { GeminiImageError, generateGeminiImage } from "./geminiImage";
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
  // 2026-10-17: 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio). 키는 머리글로,
  // 시간 제한·서버 오류·혼잡 1회 재시도, 응답의 모든 조각에서 최종 이미지 탐색, 안전 차단 구분. 프롬프트·참고 이미지·비율·1K·온도 0.7은 그대로.
  let image: { base64: string };
  try {
    image = await generateGeminiImage({
      apiKey: params.apiKey,
      modelName: IMAGE_MODEL,
      parts: [{ text: params.prompt }, ...params.references.map((ref) => ({ inlineData: { mimeType: ref.mimeType, data: ref.data } }))],
      aspectRatio: params.ratio,
      imageSize: "1K",
      temperature: 0.7,
      responseModalities: ["Image"],
      timeoutMs: 110_000,
    });
  } catch (e) {
    if (!(e instanceof GeminiImageError)) throw e;
    if ([400, 401, 403, 404, 429].includes(e.status)) throw new Error(geminiErrorMessage(e.status, "이미지 생성"));
    if (e.code === "SAFETY_BLOCKED" || e.code === "NO_IMAGE") throw new Error("응답에 이미지가 없습니다. 안전 정책에 걸렸을 수 있으니 장면 묘사를 바꿔 다시 시도해주세요.");
    throw new Error(e.message);
  }
  const jpeg = await sharp(Buffer.from(image.base64, "base64")).jpeg({ quality: 88 }).toBuffer();
  return { mimeType: "image/jpeg", data: jpeg.toString("base64") };
}
