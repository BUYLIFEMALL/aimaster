// 회원 본인의 Gemini 키로 브라우저에서 직접 호출한다(이 프로그램의 기존 방식: 키는 이 브라우저에만 보관된다).
// 키는 요청 헤더로만 보내고 오류 문구에는 넣지 않는다.
import { IMAGE_ENGINES, finalizePrompt, type ImageEngineId } from "./imagePlan";
import type { ImageRatio } from "./types";

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

export interface TextCallOptions {
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export async function callGeminiText(apiKey: string, model: string, system: string, user: string, options: TextCallOptions = {}): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 16384,
          ...(options.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
      signal: options.signal,
    });
  } catch {
    throw new Error("Gemini 서버에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(httpMessage(res.status, data?.error?.message ?? "", apiKey));
  const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("").trim();
  if (!text) {
    const why = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason ?? "?";
    throw new Error(`Gemini가 빈 응답을 돌려줬습니다. 다시 시도하거나 다른 모델을 선택해주세요. (${why})`);
  }
  return text;
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

/** 나노바나나(Gemini 이미지)로 이미지 1장을 만든다. */
export async function generateGeminiImage(apiKey: string, engine: ImageEngineId, prompt: string, ratio: ImageRatio, signal?: AbortSignal): Promise<GeneratedImage> {
  const cfg = IMAGE_ENGINES[engine];
  let res: Response;
  try {
    res = await fetch(`${BASE}/v1/models/${cfg.model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalizePrompt(prompt) }] }],
        generationConfig: {
          responseModalities: ["Image"],
          imageConfig: { aspectRatio: ratio, imageSize: cfg.size },
          temperature: cfg.temperature,
        },
      }),
      signal,
    });
  } catch {
    throw new Error("이미지 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (/safety|blocked|policy/i.test(detail)) throw new Error("안전 정책에 걸려 이미지를 만들지 못했습니다. 프롬프트를 바꿔 다시 시도해주세요.");
    throw new Error(httpMessage(res.status, (() => { try { return JSON.parse(detail)?.error?.message ?? ""; } catch { return ""; } })(), apiKey));
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[] };
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error("응답에 이미지가 없습니다. 안전 정책에 걸렸을 수 있으니 프롬프트를 바꿔 다시 시도해주세요.");
  return { base64: part.inlineData.data.replace(/\s+/g, ""), mime: part.inlineData.mimeType || "image/png" };
}
