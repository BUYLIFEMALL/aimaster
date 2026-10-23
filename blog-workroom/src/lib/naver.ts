import "server-only";
import crypto from "node:crypto";
import { stripHtml, mergeSuggestions, autocompleteQueries } from "@/lib/util";

// 외부 호출은 전부 서버에서, 아래 고정된 주소로만 한다(임의 주소를 받는 프록시는 만들지 않는다).
// 네이버 검색·데이터랩은 2026-07-31부터 신규 발급이 NAVER API HUB(NCP)로 옮겨졌다.
//   → API HUB를 먼저 시도하고, 인증/미가입류 오류(401/403/404)일 때만 구방식(openapi.naver.com)으로 폴백한다
//   (threads-affiliate-poster/src/lib/naver/search.ts·trend.ts와 같은 방식). 키는 회원 본인 것만 쓴다.
const HUB_SEARCH = "https://naverapihub.apigw.ntruss.com/search/v1";
const HUB_TREND = "https://naverapihub.apigw.ntruss.com/search-trend/v1/search";
const LEGACY_SEARCH = "https://openapi.naver.com/v1/search";
const LEGACY_TREND = "https://openapi.naver.com/v1/datalab/search";
const ADS_BASE = "https://api.searchad.naver.com";
const FALLBACK = new Set([401, 403, 404]);
const TIMEOUT_MS = 12_000;

export interface NaverAuth { clientId: string; clientSecret: string }
export interface AdsAuth { apiKey: string; secretKey: string; customerId: string }

export type NaverErrorCode = "auth" | "quota" | "http" | "network";
export class NaverError extends Error {
  constructor(public code: NaverErrorCode, message: string, public status = 502) { super(message); }
}

function classify(status: number, body: string, what: string): NaverError {
  if (status === 401 || status === 403) {
    return new NaverError("auth", `${what} 인증에 실패했습니다. 등록한 네이버 Client ID/Secret과 사용 API 설정(검색·데이터랩)을 확인해 주세요.`, 400);
  }
  if (status === 429) return new NaverError("quota", `${what} 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요(네이버는 계정당 일일 한도가 있습니다).`, 429);
  let detail = "";
  try { detail = String((JSON.parse(body) as { errorMessage?: string; message?: string }).errorMessage ?? (JSON.parse(body) as { message?: string }).message ?? ""); } catch { /* 본문이 JSON이 아님 */ }
  return new NaverError("http", `${what} 호출에 실패했습니다(${status}). ${detail}`.trim(), 502);
}

async function call(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch {
    throw new NaverError("network", "네이버 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", 504);
  }
}

// ---- 검색(블로그·뉴스) ----
export interface RawItem { title: string; link: string; description: string; pubDate?: string; postdate?: string; bloggername?: string; bloggerlink?: string; originallink?: string }
export interface SearchOut { total: number; items: RawItem[] }

export async function naverSearch(auth: NaverAuth, type: "blog" | "news" | "webkr", query: string, opts: { display?: number; sort?: "sim" | "date" } = {}): Promise<SearchOut> {
  const display = Math.min(type === "webkr" ? 30 : 100, Math.max(1, opts.display ?? 10));
  const qs = `?query=${encodeURIComponent(query)}&display=${display}&start=1&sort=${opts.sort ?? "sim"}`;
  let r = await call(`${HUB_SEARCH}/${type}${qs}`, {
    headers: { "X-NCP-APIGW-API-KEY-ID": auth.clientId, "X-NCP-APIGW-API-KEY": auth.clientSecret },
  });
  if (!r.ok && FALLBACK.has(r.status)) {
    r = await call(`${LEGACY_SEARCH}/${type}.json${qs}`, {
      headers: { "X-Naver-Client-Id": auth.clientId, "X-Naver-Client-Secret": auth.clientSecret },
    });
  }
  if (!r.ok) throw classify(r.status, r.text, type === "blog" ? "네이버 블로그 검색" : type === "news" ? "네이버 뉴스 검색" : "네이버 웹문서 검색");
  let data: { total?: number; items?: RawItem[] };
  try { data = JSON.parse(r.text); } catch { throw new NaverError("http", "네이버 응답을 해석하지 못했습니다.", 502); }
  const items = (data.items ?? []).map((it) => ({
    ...it,
    title: stripHtml(it.title),
    description: stripHtml(it.description),
    bloggername: stripHtml(it.bloggername),
  }));
  return { total: Number(data.total ?? 0), items };
}

// ---- 데이터랩 검색어 트렌드 ----
export interface TrendGroup { title: string; keywords: string[]; data: { period: string; ratio: number }[] }

export async function naverTrend(auth: NaverAuth, params: { startDate: string; endDate: string; timeUnit: "date" | "week" | "month"; groups: { groupName: string; keywords: string[] }[] }): Promise<TrendGroup[]> {
  const payload = JSON.stringify({ startDate: params.startDate, endDate: params.endDate, timeUnit: params.timeUnit, keywordGroups: params.groups.slice(0, 5) });
  const headersJson = { "Content-Type": "application/json" };
  let r = await call(HUB_TREND, {
    method: "POST",
    headers: { ...headersJson, "X-NCP-APIGW-API-KEY-ID": auth.clientId, "X-NCP-APIGW-API-KEY": auth.clientSecret },
    body: payload,
  });
  if (!r.ok && FALLBACK.has(r.status)) {
    r = await call(LEGACY_TREND, {
      method: "POST",
      headers: { ...headersJson, "X-Naver-Client-Id": auth.clientId, "X-Naver-Client-Secret": auth.clientSecret },
      body: payload,
    });
  }
  if (!r.ok) throw classify(r.status, r.text, "네이버 데이터랩 검색어 트렌드");
  try {
    const data = JSON.parse(r.text) as { results?: TrendGroup[] };
    return data.results ?? [];
  } catch { throw new NaverError("http", "네이버 응답을 해석하지 못했습니다.", 502); }
}

// ---- 검색광고 키워드도구(월간 검색수) ----
export interface AdsKeyword { keyword: string; pc: number; mobile: number; total: number; compIdx: string | null }

function adsNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.includes("<")) return 5; // "< 10"
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function adsKeywords(auth: AdsAuth, hint: string): Promise<AdsKeyword[]> {
  const seed = hint.replace(/\s+/g, ""); // hintKeywords에는 공백이 들어가면 400
  const path = "/keywordstool";
  const ts = Date.now().toString();
  const sig = crypto.createHmac("sha256", auth.secretKey).update(`${ts}.GET.${path}`).digest("base64");
  const r = await call(`${ADS_BASE}${path}?hintKeywords=${encodeURIComponent(seed)}&showDetail=1`, {
    headers: { "X-Timestamp": ts, "X-API-KEY": auth.apiKey, "X-Customer": auth.customerId, "X-Signature": sig },
  });
  if (!r.ok) throw classify(r.status, r.text, "네이버 검색광고 키워드도구");
  try {
    const data = JSON.parse(r.text) as { keywordList?: Record<string, unknown>[] };
    return (data.keywordList ?? []).map((k) => {
      const pc = adsNumber(k.monthlyPcQcCnt);
      const mobile = adsNumber(k.monthlyMobileQcCnt);
      return { keyword: String(k.relKeyword ?? ""), pc, mobile, total: pc + mobile, compIdx: typeof k.compIdx === "string" ? k.compIdx : null };
    });
  } catch { throw new NaverError("http", "네이버 응답을 해석하지 못했습니다.", 502); }
}

// ---- 자동완성(비공식 공개 엔드포인트: 실패하면 건너뛴다) ----
async function naverSuggest(q: string): Promise<string[]> {
  try {
    const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: unknown[][][] };
    const rows = data.items?.[0] ?? [];
    return rows.map((r) => (Array.isArray(r) ? String(r[0] ?? "") : "")).filter(Boolean);
  } catch { return []; }
}

async function googleSuggest(q: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=ko&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown[];
    return Array.isArray(data[1]) ? (data[1] as unknown[]).map((x) => String(x)) : [];
  } catch { return []; }
}

/** 자동완성 키워드 최대 20개. 네이버는 자음(ㄱ~ㅎ)을 붙여 15회 병렬 조회해 합친다. */
export async function autocomplete(engine: "naver" | "google", keyword: string): Promise<string[]> {
  if (engine === "google") {
    const base = await googleSuggest(keyword);
    return mergeSuggestions(keyword, [base], 20);
  }
  const lists = await Promise.all(autocompleteQueries(keyword).map((q) => naverSuggest(q)));
  return mergeSuggestions(keyword, lists, 20);
}
