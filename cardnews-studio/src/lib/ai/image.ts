import "server-only";
import { GeminiImageError, generateGeminiImage } from "./geminiImage";
import { findImageModel } from "./imageModels";

export type ImageBytes = { bytes: Buffer; mime: string };

function errorMessage(status: number, detail: string): string {
  if (status === 401 || status === 403) return "Gemini API 키 또는 이미지 생성 모델 사용 권한을 확인해 주세요.";
  if (status === 404) return "이 Gemini 계정에서 선택한 이미지 모델을 사용할 수 없습니다. 다른 이미지 모델을 선택해 보세요.";
  if (status === 429) return "Gemini API 할당량 또는 분당 요청 한도에 도달했습니다. 잠시 뒤 다시 시도하거나 결제·사용 한도를 확인해 주세요.";
  if (/safety|blocked|policy/i.test(detail)) return "안전 정책에 걸려 이미지를 만들지 못했습니다. 주제나 추가 요청을 바꿔 다시 시도해 주세요.";
  return `이미지 생성에 실패했습니다. (Gemini ${status})`;
}

/** 회원 본인 Gemini 키로 배경 이미지 1장을 만든다. 키는 헤더로만 보내고 오류 문구에 넣지 않는다. */
export async function generateBackground(params: {
  apiKey: string;
  imageModel: string;
  prompt: string;
  ratio: "4:5" | "1:1";
}): Promise<ImageBytes> {
  const config = findImageModel(params.imageModel);
  if (!config) throw new Error("지원하지 않는 이미지 모델입니다.");

  // 2026-10-17: 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio). 키는 머리글로,
  // 시간 제한·서버 오류·혼잡 1회 재시도, 응답의 모든 조각에서 최종 이미지 탐색, 안전 차단 구분. 프롬프트·비율·화질은 그대로.
  let image: { base64: string; mimeType: string };
  try {
    image = await generateGeminiImage({
      apiKey: params.apiKey,
      modelName: config.model,
      prompt: params.prompt,
      aspectRatio: params.ratio,
      imageSize: config.size,
      temperature: config.temperature,
      responseModalities: ["Image"],
      timeoutMs: 110_000,
    });
  } catch (e) {
    if (e instanceof GeminiImageError) {
      // 키·권한·모델·한도 오류는 이 프로그램의 기존 안내 문구를 그대로 쓴다
      if ([401, 403, 404, 429].includes(e.status)) throw new Error(errorMessage(e.status, ""));
      throw new Error(e.message);
    }
    throw e;
  }
  return { bytes: Buffer.from(image.base64, "base64"), mime: image.mimeType };
}
