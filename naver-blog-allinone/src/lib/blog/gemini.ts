// [이미지 모델 교체 2026-10-17] 구형(gemini-nano-banana-2.1·gemini-nano-banana-2.1·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image·경량 1K는 gemini-3.1-flash-lite-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 회원 본인의 Gemini 키로 브라우저에서 직접 호출한다(이 프로그램의 기존 방식: 키는 이 브라우저에만 보관된다).
// 키는 요청 헤더로만 보내고 오류 문구에는 넣지 않는다.
import { finalizePrompt } from "./imagePlan";
import type { ImageRatio } from "./types";
import { getNanoBananaConfig } from "./nanoBananaModels";
import { generateGeminiImage as generateGeminiImageCore } from "./geminiImage";

const BASE = "https://generativelanguage.googleapis.com";

function scrub(text: string, apiKey: string): string {
  let out = text;
  if (apiKey) out = out.split(apiKey).join("***");
  return out.replace(/key=[^&\s"]+/gi, "key=***").slice(0, 200);
}

function httpMessage(status: number, detail: string, apiKey: string): string {
  const d = scrub(detail, apiKey);
  if (status === 400 && /API key/i.test(detail)) return "Gemini API 키가 올바르지 않습니다. [API키등록·플랫폼연동]에서 본인 키를 확인해주세요.";
  if (status === 401 || status === 403) return "Gemini API 키가 올바르지 않거나 이 모델을 쓸 권한이 없습니다. 본인 키를 확인해주세요.";
  if (status === 404) return "이 Gemini 계정에서 선택한 모델을 사용할 수 없습니다. 설정에서 다른 모델을 선택해보세요.";
  if (status === 429) return "Gemini 사용 한도나 분당 요청 한도를 넘었습니다. 잠시 뒤 다시 시도해주세요.";
  return `Gemini 호출에 실패했습니다. (${status}) ${d}`;
}

/** JSON 응답에서 중괄호 구간만 꺼내 파싱한다. 실패하면 null. */
export function parseJsonLoose<T>(text: string): T | null {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export interface GeneratedImage {
  base64: string;
  mime: string;
}

// 2026-10-17: 등급별 모델·화질·온도는 공용 기준 코드 gemini-image-models(./nanoBananaModels — 기준은 ai-image-studio)로 통합(주인님 지시).

/** 나노바나나(Gemini 이미지)로 이미지 1장을 만든다. */
// 2026-10-17: 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio)로.
// 키는 머리글로(브라우저에서 직접 호출하는 기존 방식 그대로), 시간 제한·서버 오류·혼잡 1회 재시도, 안전 차단·한도·키 오류 한국어 안내(키 가림).
// 마지막 인자(취소 신호)는 호출하는 곳에서 넘기지 않아 쓰이지 않던 자리라 이름만 남겨 둔다.
export async function generateGeminiImage(apiKey: string, modelId: string, prompt: string, ratio: ImageRatio, _signal?: AbortSignal): Promise<GeneratedImage> {
  const cfg = getNanoBananaConfig(modelId);
  const image = await generateGeminiImageCore({
    apiKey,
    modelName: cfg.modelName,
    prompt: finalizePrompt(prompt),
    aspectRatio: ratio,
    imageSize: cfg.imageSize,
    temperature: cfg.temperature,
    responseModalities: ["Image"],
  });
  return { base64: image.base64, mime: image.mimeType };
}
