import "server-only";
import { getNanoBananaConfig } from "./nanoBananaConfig";
import { generateGeminiImage } from "./geminiImage";

// blog 서브프로젝트의 utils/news/imageGenerator.ts(나노바나나 모델별 선택 파이프라인)와
// 동일한 방식 — 사용자가 모델(해상도/버전)을 고르면 그에 맞는 공식 엔드포인트로 호출한다
// (docs/PLATFORM_PATTERNS.md §12: Cloudinary generate-image를 거치지 않고 직접 호출).

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export async function generateBlogImage(params: {
  apiKey: string;
  topic: string;
  model?: string;
}): Promise<GeneratedImage> {
  const { apiKey, topic, model = "nanobanana-2-2k" } = params;
  const modelConfig = getNanoBananaConfig(model);

  // 인물이 등장할 수 있는 프롬프트라 루트 CLAUDE.md 불변의 핵심 원칙 3번(기본은 한국인/
  // 동아시아인 묘사)을 반영한다 — blog/utils/ai/editorImage.ts와 동일한 문구.
  const prompt = `Create a single photorealistic photo for a Korean blog post. Topic: ${topic}. If human figures appear, depict realistic Korean/East Asian individuals by default — only depict a different ethnicity when the topic explicitly names a foreign celebrity, politician, athlete, or a foreign country/setting central to the scene. One unified scene in a single frame, not a collage, not a split screen, not multiple panels. Photorealistic, documentary-quality photography, natural lighting, 16:9, no visible text, no watermark.`;

  // 2026-10-17: 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio)로.
  // 키는 머리글로, 120초 시간 제한, 서버 오류·혼잡 1회 재시도, 안전 차단·키 오류 한국어 안내(키 가림).
  // 예전엔 응답의 첫 조각(parts[0])만 봐서 설명 글이 먼저 오면 이미지를 놓쳤다 — 이제 모든 조각에서 찾는다. 프롬프트·모델·화질·온도는 그대로.
  const image = await generateGeminiImage({
    apiKey,
    modelName: modelConfig.modelName,
    prompt,
    aspectRatio: "16:9",
    imageSize: modelConfig.imageSize,
    temperature: modelConfig.temperature,
    responseModalities: ["Image"],
  });
  return { base64: image.base64, mimeType: image.mimeType };
}
