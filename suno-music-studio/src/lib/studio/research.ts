import { type Provider } from "./config";
import { AppError } from "./validation";
export interface ResearchSource {
  title: string;
  url: string;
}
export interface Research {
  text: string;
  sources: ResearchSource[];
  suggestionsHtml?: string;
}
export function safeSources(input: ResearchSource[]): ResearchSource[] {
  const seen = new Set<string>();
  return input
    .filter((s) => {
      try {
        const u = new URL(s.url);
        if (
          !["https:", "http:"].includes(u.protocol) ||
          u.username ||
          u.password ||
          seen.has(u.href)
        )
          return false;
        seen.add(u.href);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 20)
    .map((s) => ({ url: s.url, title: (s.title || s.url).slice(0, 300) }));
}
type Block = {
  type?: string;
  text?: string;
  citations?: { title?: string; url?: string }[];
  annotations?: { type?: string; title?: string; url?: string }[];
  content?: Block[];
  error_code?: string;
};
interface SearchResponse {
  status?: string;
  stop_reason?: string;
  content?: Block[];
  output?: Block[];
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: {
      groundingChunks?: { web?: { title?: string; uri?: string } }[];
      searchEntryPoint?: { renderedContent?: string };
    };
  }[];
}
export async function researchMusic(
  provider: Provider,
  model: string,
  key: string,
  query: string,
  signal: AbortSignal,
  send: typeof fetch = fetch,
): Promise<Research> {
  const instruction = `Current year ${new Date().getFullYear()}. Search public reliable sources about this musical topic, its genres, instruments, tempo and musical structure. Cite sources. Briefly summarize relevant music properties in Korean. Do not reproduce lyrics. User topic: ${query}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let url: string, body: unknown;
  if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers["x-goog-api-key"] = key;
    body = {
      contents: [{ role: "user", parts: [{ text: instruction }] }],
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: 2500 },
    };
  } else if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
    body = {
      model,
      max_tokens: 2500,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
      messages: [{ role: "user", content: instruction }],
    };
  } else {
    url = "https://api.openai.com/v1/responses";
    headers.Authorization = `Bearer ${key}`;
    body = {
      model,
      input: instruction,
      tools: [{ type: "web_search" }],
      max_output_tokens: 2500,
    };
  }
  const r = await send(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]),
  });
  if (!r.ok)
    throw new AppError(
      `웹 검색 요청이 실패했습니다 (${r.status}). 선택 모델의 검색 지원과 본인 키·한도를 확인해 주세요.`,
      r.status === 429 ? 429 : 502,
    );
  const d: SearchResponse = await r.json();
  if (
    d.status === "incomplete" ||
    d.status === "failed" ||
    d.stop_reason === "max_tokens" ||
    d.candidates?.[0]?.finishReason === "MAX_TOKENS"
  )
    throw new AppError(
      "웹 검색 결과가 완성되지 않았습니다. 다시 검색해 주세요.",
      502,
    );
  const sources: ResearchSource[] = [];
  let text = "";
  let suggestionsHtml: string | undefined;
  if (provider === "gemini") {
    const c = d.candidates?.[0];
    text = c?.content?.parts?.map((p) => p.text || "").join("") || "";
    c?.groundingMetadata?.groundingChunks?.forEach((p) => {
      if (p.web?.uri)
        sources.push({ title: p.web.title || "", url: p.web.uri });
    });
    const html = c?.groundingMetadata?.searchEntryPoint?.renderedContent;
    if (html && html.length <= 100000) suggestionsHtml = html;
  } else {
    const visit = (blocks: Block[]) =>
      blocks.forEach((b) => {
        if (b.type === "web_search_tool_result_error" || b.error_code)
          throw new AppError(
            "공급사의 웹 검색 도구가 오류를 반환했습니다. 검색 권한과 한도를 확인해 주세요.",
            502,
          );
        if (b.text) {
          text += b.text + "\n";
          [...(b.citations || []), ...(b.annotations || [])].forEach((a) => {
            if (a.url) sources.push({ title: a.title || "", url: a.url });
          });
        }
        if (b.content) visit(b.content);
      });
    visit(provider === "anthropic" ? d.content || [] : d.output || []);
  }
  const checked = safeSources(sources);
  if (!text.trim() || !checked.length)
    throw new AppError(
      "확인 가능한 출처를 받지 못했습니다. 웹 검색으로 표시하지 않습니다. 검색어·모델을 바꾸거나 웹 검색을 끄고 AI 제안을 사용해 주세요.",
      502,
    );
  return {
    text: text.trim().slice(0, 8000),
    sources: checked,
    ...(suggestionsHtml ? { suggestionsHtml } : {}),
  };
}
