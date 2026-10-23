import "server-only";
import { adsKeywords, naverSearch, NaverError, type AdsAuth, type AdsKeyword, type NaverAuth } from "@/lib/naver";
import { keywordGrade, GRADE_ORDER } from "@/lib/logic";
import { inBatches } from "@/lib/blog";
import type { KeywordMetric } from "@/lib/types";

const key = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** 검색어 여러 개의 공식 수치: 검색광고 월간 검색량(5개씩 묶어 조회) + 블로그 문서수 → 등급 */
export async function keywordMetrics(ads: AdsAuth, naver: NaverAuth, keywords: string[], opts: { withRelated?: boolean } = {}): Promise<{ metrics: KeywordMetric[]; related: AdsKeyword[] }> {
  const uniq = [...new Map(keywords.map((k) => [key(k), k.trim()])).values()].filter(Boolean).slice(0, 40);
  const volume = new Map<string, AdsKeyword>();
  const related: AdsKeyword[] = [];
  for (let i = 0; i < uniq.length; i += 5) {
    const group = uniq.slice(i, i + 5);
    let list: AdsKeyword[] = [];
    try { list = await adsKeywords(ads, group.map((g) => g.replace(/\s+/g, "")).join(",")); }
    catch (e) { if (e instanceof NaverError && e.code === "auth") throw e; continue; }
    for (const k of list) {
      const kk = key(k.keyword);
      if (group.some((g) => key(g) === kk)) volume.set(kk, k);
      else if (opts.withRelated) related.push(k);
    }
  }
  const docs = await inBatches(uniq, 5, async (k) => {
    try { return (await naverSearch(naver, "blog", k, { display: 1 })).total; }
    catch (e) { if (e instanceof NaverError && e.code === "auth") throw e; return null; }
  });
  const metrics = uniq.map((k, i) => {
    const v = volume.get(key(k));
    const total = v?.total ?? 0;
    const g = keywordGrade(total, docs[i]);
    return { keyword: k, pc: v?.pc ?? 0, mobile: v?.mobile ?? 0, total, docs: docs[i], ratio: g.ratio, grade: g.grade, compIdx: v?.compIdx ?? null };
  });
  return { metrics: sortMetrics(metrics), related };
}

export function sortMetrics(m: KeywordMetric[]): KeywordMetric[] {
  return [...m].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || b.total - a.total);
}

/** 검색광고 연관어는 긴 검색어로 물으면 자기 자신만 돌려준다 — 짧은 단어(최대 5개)로 다시 물어 연관어를 받는다 */
export async function shortRelated(ads: AdsAuth, phrases: string[]): Promise<AdsKeyword[]> {
  const words = [...new Set(phrases.flatMap((p) => [p.replace(/\s+/g, ""), ...p.split(/\s+/)]).filter((w) => w.length >= 2 && w.length <= 15))].slice(0, 5);
  if (!words.length) return [];
  try { return await adsKeywords(ads, words.join(",")); }
  catch (e) { if (e instanceof NaverError && e.code === "auth") throw e; return []; }
}
