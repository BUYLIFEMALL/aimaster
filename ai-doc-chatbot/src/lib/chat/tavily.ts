import "server-only";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { parseMcpSearchText, type TimeRange, type WebResult } from "./core";

// Tavily 웹 검색(회원 본인 키). 공식 문서 확인 2026-10-19:
// - 원격 MCP: https://mcp.tavily.com/mcp/?tavilyApiKey=<키>, 도구 이름 tavily-search
// - MCP 연결이 실패하면 같은 키로 REST(POST https://api.tavily.com/search)를 한 번 더 시도한다.
// 키가 주소에 들어가므로 오류 문구에는 절대 주소를 넣지 않는다.

export type { WebResult };

/** 검색 조건 — 뉴스 질문은 topic "news", 기간이 있으면 time_range(L8) */
export interface SearchOptions {
  topic?: "general" | "news";
  timeRange?: TimeRange | null;
}

function searchArgs(query: string, maxResults: number, opts: SearchOptions): Record<string, unknown> {
  return {
    query,
    max_results: maxResults,
    search_depth: "basic",
    topic: opts.topic ?? "general",
    ...(opts.timeRange ? { time_range: opts.timeRange } : {}),
  };
}

export interface WebSearchOutcome {
  via: "mcp" | "rest";
  results: WebResult[];
}

async function searchViaMcp(apiKey: string, query: string, maxResults: number, opts: SearchOptions): Promise<WebResult[]> {
  const transport = new StreamableHTTPClientTransport(new URL(`https://mcp.tavily.com/mcp/?tavilyApiKey=${encodeURIComponent(apiKey)}`));
  const client = new Client({ name: "ai-doc-chatbot", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = (await client.callTool({ name: "tavily-search", arguments: searchArgs(query, maxResults, opts) })) as {
      content?: { type: string; text?: string }[];
      isError?: boolean;
    };
    if (result.isError) throw new Error("tavily-search 도구가 오류를 돌려주었습니다.");
    const text = (result.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
    return parseMcpSearchText(text).slice(0, maxResults);
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function searchViaRest(apiKey: string, query: string, maxResults: number, opts: SearchOptions): Promise<WebResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(searchArgs(query, maxResults, opts)),
  });
  if (res.status === 401 || res.status === 403) throw new Error("Tavily API 키가 올바르지 않습니다. [API키등록·플랫폼연동]에서 키를 확인해 주세요.");
  if (res.status === 429 || res.status === 432) throw new Error("Tavily 사용 한도에 걸렸습니다. Tavily 콘솔에서 남은 검색 횟수를 확인해 주세요.");
  if (!res.ok) throw new Error(`Tavily 검색이 실패했습니다(${res.status}).`);
  const data = (await res.json()) as { results?: (WebResult & { published_date?: string })[] };
  return (data.results ?? []).map((r) => ({
    title: r.title ?? r.url,
    url: r.url,
    content: String(r.content ?? "").slice(0, 1500),
    ...(r.published_date ? { published: r.published_date } : {}),
  }));
}

/** 웹 검색: MCP 먼저, 실패하면 REST. 둘 다 실패하면 REST 쪽 오류를 던진다 */
export async function webSearch(apiKey: string, query: string, maxResults = 5, opts: SearchOptions = {}): Promise<WebSearchOutcome> {
  try {
    const results = await searchViaMcp(apiKey, query, maxResults, opts);
    if (results.length) return { via: "mcp", results };
  } catch (err) {
    console.warn("tavily mcp failed, fallback to rest:", String((err as Error)?.message ?? "").split(apiKey).join("***").slice(0, 200));
  }
  return { via: "rest", results: await searchViaRest(apiKey, query, maxResults, opts) };
}
