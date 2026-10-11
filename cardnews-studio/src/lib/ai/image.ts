import "server-only";
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${config.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": params.apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: params.prompt }] }],
      generationConfig: {
        responseModalities: ["Image"],
        imageConfig: { aspectRatio: params.ratio, imageSize: config.size },
        temperature: config.temperature,
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(110_000),
  });

  if (!response.ok) {
    throw new Error(errorMessage(response.status, await response.text().catch(() => "")));
  }
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
  };
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) {
    throw new Error("응답에 이미지가 없습니다. 안전 정책에 걸렸을 수 있으니 다시 시도해 주세요.");
  }
  return {
    bytes: Buffer.from(part.inlineData.data.replace(/\s+/g, ""), "base64"),
    mime: part.inlineData.mimeType || "image/png",
  };
}
