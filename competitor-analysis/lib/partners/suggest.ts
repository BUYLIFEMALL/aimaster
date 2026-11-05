import "server-only";
import crypto from "node:crypto";
import { searchChannels, type NaverAuth } from "@/lib/naver/search";

// 제휴 타깃 찾기 — 키워드 추천(주인님 2026-11-05 「어떤 키워드로 검색해야 할지 모르는 사람이 많으니, 메인·연관·많이 검색하는 키워드·카테고리 추천」).
// 기준 코드: blog-keyword/src/lib/kw/naver.ts 의 autocomplete·adsKeywords(같은 방식). 회원 본인 키만, 키 없으면 그 묶음만 건너뛴다.
// 비용: 자동완성 무료·검색 API 무료(쿼터)·검색광고 키워드도구 무료(회원 광고 계정). AI 호출 없음.


const JAMO = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const ADS_BASE = "https://api.searchad.naver.com";

export interface AdsAuth { apiKey: string; secretKey: string; customerId: string }
export interface VolumeKeyword { keyword: string; total: number; compIdx: string | null }
export interface Suggestions {
  main: string;
  related: string[];
  popular: VolumeKeyword[];
  popularNeedsKey: boolean;
  categories: { text: string; count: number }[];
  categoriesNeedKey: boolean;
}

async function naverSuggest(q: string): Promise<string[]> {
  try {
    const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: unknown[][][] };
    return (data.items?.[0] ?? []).map((r) => (Array.isArray(r) ? String(r[0] ?? "") : "")).filter(Boolean);
  } catch { return []; }
}

/** 연관 키워드: 자동완성(자음 ㄱ~ㅎ를 붙여 함께 조회) 최대 20개. */
async function related(keyword: string): Promise<string[]> {
  const lists = await Promise.all(["", ...JAMO].map((j) => naverSuggest(j ? `${keyword} ${j}` : keyword)));
  const base = keyword.replace(/\s+/g, "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) for (const raw of list) {
    const text = raw.replace(/\s+/g, " ").trim();
    const key = text.replace(/\s+/g, "");
    if (!text || key === base || seen.has(key)) continue;
    seen.add(key); out.push(text);
    if (out.length >= 20) return out;
  }
  return out;
}

function adsNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.includes("<")) return 5;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 많이 검색하는 키워드: 네이버 검색광고 키워드도구(월간 PC+모바일 검색량 순) 최대 20개. */
async function popular(auth: AdsAuth, keyword: string): Promise<VolumeKeyword[]> {
  const path = "/keywordstool";
  const ts = Date.now().toString();
  const sig = crypto.createHmac("sha256", auth.secretKey).update(`${ts}.GET.${path}`).digest("base64");
  try {
    const res = await fetch(`${ADS_BASE}${path}?hintKeywords=${encodeURIComponent(keyword.replace(/\s+/g, ""))}&showDetail=1`, {
      headers: { "X-Timestamp": ts, "X-API-KEY": auth.apiKey, "X-Customer": auth.customerId, "X-Signature": sig },
      signal: AbortSignal.timeout(12000), cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { keywordList?: Record<string, unknown>[] };
    return (data.keywordList ?? [])
      .map((k) => ({ keyword: String(k.relKeyword ?? ""), total: adsNumber(k.monthlyPcQcCnt) + adsNumber(k.monthlyMobileQcCnt), compIdx: typeof k.compIdx === "string" ? k.compIdx : null }))
      .filter((k) => k.keyword)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  } catch { return []; }
}

/** 카테고리: 그 주제로 나온 업체·쇼핑몰의 실제 분류를 모아 많이 나온 순. */
async function categories(auth: NaverAuth, keyword: string): Promise<{ text: string; count: number }[]> {
  const [local, shop] = await Promise.all([
    searchChannels(auth, "local", keyword, 5).catch(() => []),
    searchChannels(auth, "shop", keyword, 40).catch(() => []),
  ]);
  const tally = new Map<string, number>();
  for (const h of [...local, ...shop]) {
    for (const part of h.category.split(/>|,/).map((p) => p.trim()).filter((p) => p.length >= 2)) {
      tally.set(part, (tally.get(part) ?? 0) + h.hit_count);
    }
  }
  return Array.from(tally.entries()).map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 12);
}

export async function suggestTerms(keyword: string, search: NaverAuth | null, ads: AdsAuth | null): Promise<Suggestions> {
  const [rel, pop, cats] = await Promise.all([
    related(keyword),
    ads ? popular(ads, keyword) : Promise.resolve([] as VolumeKeyword[]),
    search ? categories(search, keyword) : Promise.resolve([] as { text: string; count: number }[]),
  ]);
  return { main: keyword, related: rel, popular: pop, popularNeedsKey: !ads, categories: cats, categoriesNeedKey: !search };
}
