// 2026-11-15 AI 비서 「검색 도구 고르기」(플랜 docs/PLAN_20261115_SEARCH_TOOL_CHOICE.md, 주인님 「여러 가지 검색 도구를 제시」).
// · 회원 본인 키만(공용 user_api_keys — 다른 프로그램에서 등록한 키 그대로). 운영자 키 없음, 다른 회원 키로 대신하지 않음.
// · 외부 검색은 모델 종류와 상관없이 「web_search」 함수 도구로 넣고 서버가 실행한다 → Claude·OpenAI·Gemini 모두 같은 방식.
// · 「자동」: Claude·OpenAI는 모델 내장 검색, Gemini(내장 검색 아직 미연결)는 등록된 외부 검색 키를 차례로.
// · 키 값은 기록에 남기지 않는다. 결과는 제목·주소·요약 최대 8개.
import { memberSearch } from './config.ts';

export type SearchChoice = 'auto' | 'builtin' | 'naver' | 'kakao' | 'tavily' | 'perplexity' | 'serpapi';
export type ExternalSearch = Exclude<SearchChoice, 'auto' | 'builtin'>;
export const SEARCH_CHOICES: SearchChoice[] = ['auto', 'builtin', 'naver', 'kakao', 'tavily', 'perplexity', 'serpapi'];
export const EXTERNAL_ORDER: ExternalSearch[] = ['naver', 'kakao', 'tavily', 'perplexity', 'serpapi'];
/** 공용 user_api_keys provider 이름(검색 서비스별로 필요한 키) */
export const SEARCH_KEY_PROVIDERS: Record<ExternalSearch, string[]> = {
  naver: ['naver_client_id', 'naver_client_secret'],
  kakao: ['kakao_rest_api_key'],
  tavily: ['tavily'],
  perplexity: ['perplexity'],
  serpapi: ['serpapi'],
};
export const SEARCH_LABEL: Record<SearchChoice, string> = {
  auto: '자동', builtin: 'AI 모델 내장 검색', naver: '네이버 검색', kakao: '카카오(다음) 검색', tavily: 'Tavily', perplexity: 'Perplexity', serpapi: '구글 검색(SerpAPI)',
};

export interface SearchHit { title: string; url: string; snippet: string }
export interface SearchOut { hits: SearchHit[]; answer?: string }

export const isSearchChoice = (v: unknown): v is SearchChoice => typeof v === 'string' && (SEARCH_CHOICES as string[]).includes(v);
export const hasSearchKeys = (keys: Partial<Record<string, string>>, s: ExternalSearch) => SEARCH_KEY_PROVIDERS[s].every((p) => !!keys[p]);

/**
 * 이번 대화에서 쓸 검색: 'builtin'(모델 내장 서버 도구) · 외부 검색 이름 · null(검색 없음).
 * modelProvider: 지금 모델의 회사. 내장 검색은 anthropic·openai만(Gemini 내장은 미연결).
 */
export function planSearch(choice: SearchChoice, modelProvider: string | null | undefined, keys: Partial<Record<string, string>>): 'builtin' | ExternalSearch | null {
  const builtinOk = modelProvider === 'anthropic' || modelProvider === 'openai';
  const firstExternal = EXTERNAL_ORDER.find((s) => hasSearchKeys(keys, s)) ?? null;
  if (choice === 'auto' || choice === 'builtin') return builtinOk ? 'builtin' : firstExternal;
  if (hasSearchKeys(keys, choice)) return choice;
  return builtinOk ? 'builtin' : firstExternal; // 고른 서비스의 키가 없으면 내장 → 다른 외부 키
}

// ---------------------------------------------------------------- 응답 → 결과(순수 함수, 시험 가능)
const stripTags = (s: unknown) =>
  String(s ?? '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const hit = (title: unknown, url: unknown, snippet: unknown): SearchHit | null => {
  const u = typeof url === 'string' ? url.trim() : '';
  if (!/^https?:\/\//i.test(u)) return null;
  return { title: stripTags(title).slice(0, 200) || u, url: u, snippet: stripTags(snippet).slice(0, 400) };
};
const keep = (xs: (SearchHit | null)[]) => xs.filter((x): x is SearchHit => !!x).slice(0, 8);

export function parseSearch(s: ExternalSearch, j: any): SearchOut {
  switch (s) {
    case 'naver': return { hits: keep((j?.items ?? []).map((i: any) => hit(i.title, i.link, i.description))) };
    case 'kakao': return { hits: keep((j?.documents ?? []).map((d: any) => hit(d.title, d.url, d.contents))) };
    case 'tavily': return { hits: keep((j?.results ?? []).map((r: any) => hit(r.title, r.url, r.content))), ...(typeof j?.answer === 'string' && j.answer ? { answer: j.answer.slice(0, 1500) } : {}) };
    case 'serpapi': return { hits: keep((j?.organic_results ?? []).map((r: any) => hit(r.title, r.link, r.snippet))) };
    case 'perplexity': {
      const fromResults = (j?.search_results ?? []).map((r: any) => hit(r.title, r.url, r.snippet ?? r.date ?? ''));
      const fromCitations = (j?.citations ?? []).map((u: any) => hit(u, u, ''));
      const content = j?.choices?.[0]?.message?.content;
      return { hits: keep(fromResults.length ? fromResults : fromCitations), ...(typeof content === 'string' && content ? { answer: content.slice(0, 1500) } : {}) };
    }
  }
}

// ---------------------------------------------------------------- 호출
type Fetch = typeof fetch;
let fetchImpl: Fetch = (...a) => fetch(...a);
/** 시험에서 바꿔 끼움 */
export function setWebSearchFetch(f: Fetch | undefined) {
  fetchImpl = f ?? ((...a) => fetch(...a));
}

function request(s: ExternalSearch, q: string, k: Partial<Record<string, string>>): { url: string; init: RequestInit } {
  const e = encodeURIComponent(q);
  switch (s) {
    case 'naver': return { url: `https://openapi.naver.com/v1/search/webkr.json?query=${e}&display=8`, init: { headers: { 'X-Naver-Client-Id': k.naver_client_id!, 'X-Naver-Client-Secret': k.naver_client_secret! } } };
    case 'kakao': return { url: `https://dapi.kakao.com/v2/search/web?query=${e}&size=8`, init: { headers: { Authorization: `KakaoAK ${k.kakao_rest_api_key}` } } };
    case 'tavily': return { url: 'https://api.tavily.com/search', init: { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${k.tavily}` }, body: JSON.stringify({ query: q, max_results: 8, include_answer: true }) } };
    case 'serpapi': return { url: `https://serpapi.com/search.json?engine=google&q=${e}&hl=ko&gl=kr&num=8&api_key=${encodeURIComponent(k.serpapi!)}`, init: {} };
    case 'perplexity': return { url: 'https://api.perplexity.ai/chat/completions', init: { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${k.perplexity}` }, body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: q }] }) } };
  }
}

/** 회원 본인 키로 검색. 실패하면 한국어 오류(키 값은 넣지 않음) */
export async function runWebSearch(s: ExternalSearch, query: string): Promise<SearchOut> {
  const keys = memberSearch()?.keys ?? {};
  if (!hasSearchKeys(keys, s)) throw new Error(`${SEARCH_LABEL[s]} 키가 없습니다. 「API키등록·플랫폼연동」에서 등록해 주세요.`);
  const q = query.trim().slice(0, 300);
  if (!q) throw new Error('검색어가 비어 있습니다.');
  const { url, init } = request(s, q, keys);
  let res: Response;
  try {
    res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new Error(`${SEARCH_LABEL[s]}에 연결하지 못했습니다.`);
  }
  const j = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 403) throw new Error(`${SEARCH_LABEL[s]} 키가 맞지 않습니다. 키를 확인해 주세요.`);
  if (res.status === 429) throw new Error(`${SEARCH_LABEL[s]} 사용 한도를 넘었습니다.`);
  if (!res.ok) throw new Error(`${SEARCH_LABEL[s]} 검색이 실패했습니다(${res.status}).`);
  return parseSearch(s, j);
}

/** 모델에게 줄 「web_search」 함수 도구 정의 */
export const WEB_SEARCH_TOOL = {
  name: 'web_search',
  description: 'Search the web for current information. Returns titles, URLs and snippets. Cite sources by their [number].',
  input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search query (Korean is fine)' } }, required: ['query'] },
};

/** 결과 → 모델에게 돌려줄 글(출처 번호는 cite가 정한다) */
export function searchResultText(s: ExternalSearch, out: SearchOut, numberOf: (h: SearchHit) => number): string {
  if (!out.hits.length && !out.answer) return `No results from ${SEARCH_LABEL[s]}.`;
  const lines = out.hits.map((h) => `[${numberOf(h)}] ${h.title}\n${h.url}\n${h.snippet}`);
  return `${SEARCH_LABEL[s]} results:\n\n${lines.join('\n\n')}${out.answer ? `\n\nSummary from ${SEARCH_LABEL[s]}:\n${out.answer}` : ''}`;
}

/** 지금 회원·모델 기준 이번 대화의 검색(채팅·에이전트 공통) */
export function searchPlanFor(modelProvider: string | null | undefined): 'builtin' | ExternalSearch | null {
  const ms = memberSearch();
  return planSearch(isSearchChoice(ms?.choice) ? ms!.choice as SearchChoice : 'auto', modelProvider, ms?.keys ?? {});
}

type StepFn = (s: { id: string; tool: string; status: 'running' | 'done' | 'error'; label: string; detail?: string; refs?: { url: string; title: string }[]; error?: string }) => void;
/** 외부 검색 「web_search」 함수 도구 실행: 「검색 중 → 검색함(출처)」 단계 표시와 출처 번호까지(채팅·에이전트 공통) */
export async function runWebSearchTool(s: ExternalSearch, input: Record<string, unknown>, id: string, h: { step: StepFn; cite: (r: { url: string; title: string }) => number; status?: (q: string) => void }): Promise<{ content: string }> {
  const query = typeof input.query === 'string' ? input.query : '';
  h.status?.(query);
  h.step({ id, tool: 'web_search', status: 'running', label: 'Searching', detail: `${query} · ${SEARCH_LABEL[s]}` });
  try {
    const out = await runWebSearch(s, query);
    const nums = new Map<string, number>();
    const text = searchResultText(s, out, (x) => {
      const n = nums.get(x.url) ?? h.cite({ url: x.url, title: x.title });
      nums.set(x.url, n);
      return n;
    });
    h.step({ id, tool: 'web_search', status: 'done', label: 'Searched', detail: `${query} · ${SEARCH_LABEL[s]}`, refs: out.hits.map((x) => ({ url: x.url, title: x.title })) });
    return { content: text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '검색이 실패했습니다.';
    h.step({ id, tool: 'web_search', status: 'error', label: 'Searching', detail: query, error: msg });
    return { content: `Web search failed: ${msg} Answer from what you know and say that live search was not available.` };
  }
}
