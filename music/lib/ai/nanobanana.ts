// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import "server-only";
import { generateGeminiImage } from "./geminiImage";
import { getNanoBananaConfig } from "./nanoBananaModels";

// insta_auto_poster의 "nanobanana-pro" 등급(gemini-nano-banana-2.1, 4K, temperature 낮게)과
// 동일한 조합을 써서 고퀄리티 정사각형 앨범 커버를 생성한다.
// 2026-10-17: 모델·화질·온도는 공용 모델 목록의 Pro 등급(gemini-image-models — 기준은 ai-image-studio, 주인님 지시로 통합)
const ALBUM_COVER_TIER = "nanobanana-pro";

export interface AlbumCoverResult {
  base64: string;
  mimeType: string;
}

// lib/ai/musicPrompts.ts의 ALBUM_COVER_SYSTEM_PROMPT가 "텍스트를 넣지 말라"고 이미 지시하지만,
// 실제로 나노바나나가 이 지시를 무시하고 제목 타이포그래피를 자체적으로 그려 넣는 경우가
// 있었다(2026-08-15 확인 — 이번엔 우연히 제목이 정확했지만, 이미지 모델의 텍스트 렌더링은
// 오타/깨짐 위험이 있어 신뢰할 수 없다). GPT가 쓴 프롬프트 내용과 무관하게 항상 확실히
// 차단되도록, 실제 API 호출 직전에 강한 네거티브 지시를 서버에서 덧붙인다.
const NO_TEXT_SUFFIX =
  " Absolutely no text, no words, no letters, no titles, no typography, no captions, no watermark, no logo anywhere in the image — pure visual artwork only.";

/** 나노바나나(Gemini 이미지)로 곡 분위기에 맞는 고퀄리티 정사각형 앨범 커버를 생성한다. */
export async function generateAlbumCoverImage(prompt: string, apiKey: string): Promise<AlbumCoverResult> {
  if (!apiKey) {
    throw new Error("Gemini API 키가 없습니다. 설정 > API 키 설정에서 본인의 Gemini API 키를 등록해주세요.");
  }

  const config = getNanoBananaConfig(ALBUM_COVER_TIER);
  // 2026-10-17: 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client, 모델 이름은 gemini-image-models(기준은 ai-image-studio).
  // 키는 머리글로, 시간 제한·서버 오류·혼잡 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 차단·한도·키 오류 한국어 안내. 프롬프트·비율·화질은 그대로.
  const { base64, mimeType } = await generateGeminiImage({
    apiKey,
    modelName: config.modelName,
    prompt: prompt + NO_TEXT_SUFFIX,
    aspectRatio: "1:1",
    imageSize: config.imageSize,
    temperature: config.temperature,
    responseModalities: ["Image"],
  });
  return { base64, mimeType };
}
