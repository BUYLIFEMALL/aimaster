import "server-only";
import type { AiModelProvider } from "@/lib/ai/models";
import type { AiStructuredItem } from "@/lib/inspect/types";

// 「한 페이지 분석」 반복 목록 → 표(순번·제목·링크·썸네일). 2026-10-21 병합 A.
// 예전 Website Scraper는 회원 Gemini 키를 브라우저로 보내 브라우저에서 바로 불렀다 — 여기서는 서버에서만 회원 본인 키로 부른다.
// 공급자별 요청 형식은 운영 중인 수집 서비스 web-crawler/service/llm.py와 같다(GPT-5.6 계열은 temperature를 넣지 않음).
const CURRENT_YEAR = new Date().getFullYear();
const [KOREA_YEAR, KOREA_MONTH] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date()).split("-").map(Number);
const KOREA_NOW_RULE = `[기준 시점: 한국 시간으로 지금은 ${KOREA_YEAR}년 ${KOREA_MONTH}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]`;
export const MAX_AI_HTML = 45_000;

const SYSTEM_PROMPT = `당신은 웹 데이터 마이닝 및 HTML 파싱 전문가입니다. 현재 연도는 ${CURRENT_YEAR}년입니다.
${KOREA_NOW_RULE}
주어진 HTML에서 반복되는 핵심 목록(게시물·상품·뉴스·피드 등)을 찾아 JSON으로만 답합니다.`;

function userPrompt(targetUrl: string, html: string): string {
  return `아래 웹사이트 HTML에서 주요 리스트 항목을 추출해 {"items": [...]} 형식의 JSON 객체로만 답하세요(설명·코드블록 없이).
각 항목 속성:
1. no: 순번(1부터)
2. title: 항목 제목 또는 주요 텍스트
3. url: 상세 페이지 링크(상대 경로면 "${targetUrl}" 기준 절대 경로 http/https로)
4. imgUrl: 대표 썸네일 이미지 링크(상대 경로면 절대 경로로, 없으면 "")

대상 사이트 URL: ${targetUrl}
HTML 내용:
${html.slice(0, MAX_AI_HTML)}`;
}

export class InspectAiError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

async function readError(res: Response, who: string): Promise<never> {
  const text = await res.text().catch(() => "");
  if (res.status === 401 || res.status === 403) throw new InspectAiError(`본인 ${who} API 키를 확인해 주세요(설정 > API키등록·플랫폼연동).`, 400);
  if (res.status === 429) throw new InspectAiError(`본인 ${who} 계정의 사용 한도·결제 설정을 확인해 주세요.`, 429);
  throw new InspectAiError(`${who} 호출에 실패했습니다 (${res.status}): ${text.slice(0, 200)}`);
}

async function callProvider(provider: AiModelProvider, model: string, apiKey: string, prompt: string): Promise<string> {
  const signal = AbortSignal.timeout(90_000);
  if (provider === "openai" || provider === "perplexity") {
    const res = await fetch(provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.perplexity.ai/chat/completions", {
      method: "POST", signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }], response_format: { type: "json_object" }, ...(provider === "perplexity" ? { temperature: 0 } : {}) }),
    });
    if (!res.ok) return readError(res, provider === "openai" ? "OpenAI" : "Perplexity");
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  }
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal, headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 4096, system: SYSTEM_PROMPT, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) return readError(res, "Claude");
    const json = await res.json();
    return (json.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text?: string }) => b.text ?? "").join("");
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST", signal, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }),
  });
  if (!res.ok) return readError(res, "Gemini");
  const json = await res.json();
  return (json.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

const abs = (v: unknown, origin: string): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  try { return new URL(s, origin).href; } catch { return ""; }
};

export async function extractListWithAi(o: { provider: AiModelProvider; model: string; apiKey: string; targetUrl: string; html: string }): Promise<AiStructuredItem[]> {
  const text = (await callProvider(o.provider, o.model, o.apiKey, userPrompt(o.targetUrl, o.html))).trim();
  if (!text) throw new InspectAiError("AI가 응답을 돌려주지 않았습니다. 다시 시도해 주세요.");
  let parsed: unknown;
  try { parsed = JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()); }
  catch { throw new InspectAiError("AI 응답을 표로 바꾸지 못했습니다. 다른 모델로 다시 시도해 주세요."); }
  const list = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { items?: unknown })?.items) ? (parsed as { items: unknown[] }).items : null;
  if (!list) throw new InspectAiError("AI 응답에 목록이 없습니다. 반복 목록이 있는 페이지인지 확인해 주세요.", 422);
  const origin = new URL(o.targetUrl).origin;
  return list.slice(0, 200).map((raw, i) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return { no: typeof item.no === "number" ? item.no : i + 1, title: String(item.title ?? "제목 없음").trim().slice(0, 300), url: abs(item.url, origin) || o.targetUrl, imgUrl: abs(item.imgUrl, origin) };
  });
}
