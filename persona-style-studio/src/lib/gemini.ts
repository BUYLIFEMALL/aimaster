import "server-only";
import { GoogleGenAI } from "@google/genai";

// 플랫폼에서 쓰는 Gemini 텍스트 모델(다른 프로그램과 같은 계열). 바꿀 때는 이 한 줄만 고친다.
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

export interface GeminiResult { ok: true; text: string; ms: number }
export interface GeminiError { ok: false; error: string; status: number }

/** 회원 본인의 키로 텍스트를 생성한다. 오류는 사용자에게 보여줄 한국어 문구로 바꿔 돌려준다. */
export async function generateText(apiKey: string, prompt: string, json = false): Promise<GeminiResult | GeminiError> {
  const started = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      // 글 다시쓰기는 깊은 추론이 필요 없어 thinking을 끄면 응답이 몇 배 빨라진다
      config: { thinkingConfig: { thinkingBudget: 0 }, ...(json ? { responseMimeType: "application/json" } : {}) },
    });
    const text = (res.text ?? "").trim();
    if (!text) return { ok: false, error: "AI가 빈 결과를 돌려주었습니다. 다시 시도해 주세요.", status: 502 };
    return { ok: true, text, ms: Date.now() - started };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/API key|API_KEY|permission|401|403|invalid/i.test(msg)) {
      return { ok: false, error: "Gemini API 키가 올바르지 않거나 권한이 없습니다. API키등록·플랫폼연동 메뉴에서 키를 확인해 주세요.", status: 400 };
    }
    if (/quota|429|rate/i.test(msg)) {
      return { ok: false, error: "Gemini 사용 한도를 넘었습니다. 잠시 후 다시 시도하거나 본인 키의 한도를 확인해 주세요.", status: 429 };
    }
    return { ok: false, error: "생성에 실패했습니다. 잠시 후 다시 시도해 주세요.", status: 502 };
  }
}

export const NEED_KEY_RESPONSE = {
  error: "등록된 Gemini API 키가 없습니다. 좌측 메뉴의 API키등록·플랫폼연동에서 본인 API 키를 먼저 등록해 주세요.",
  needKey: true,
};
