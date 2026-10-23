import "server-only";
import { UserError } from "@/lib/errors";
import { generateJson } from "@/lib/ai";
import { adsAuth, aiConfig, naverAuth } from "@/lib/context";
import { keywordMetrics } from "@/lib/metrics";
import { naverSearch, naverTrend } from "@/lib/naver";
import { surge } from "@/lib/logic";
import { SYS_JSON, trendPrompt } from "@/lib/prompts";
import { createItem, getItem, updateItem } from "@/lib/store";
import { objArr, str, todayKst } from "@/lib/util";
import type { BlogData, BriefData, BriefSource } from "@/lib/types";
import { need, s, type Handler } from "./common";

/** 1단계: 주제 관련 최신 뉴스 10 + 웹문서 10 */
export const collect: Handler = async ({ userId, body }) => {
  const topic = s(body.topic, 60);
  if (!topic) throw new UserError(400, "관측할 주제를 입력하거나 선택해 주세요.");
  const naver = await naverAuth(userId);
  const [news, web] = await Promise.all([
    naverSearch(naver, "news", topic, { display: 10, sort: "date" }),
    naverSearch(naver, "webkr", topic, { display: 10 }).catch(() => ({ total: 0, items: [] })),
  ]);
  const sources: BriefSource[] = [
    ...news.items.map((n) => ({ kind: "뉴스" as const, title: n.title, link: n.originallink || n.link, date: n.pubDate ? new Date(n.pubDate).toISOString() : "", summary: n.description })),
    ...web.items.map((w) => ({ kind: "웹" as const, title: w.title, link: w.link, date: "", summary: w.description })),
  ];
  if (!sources.length) throw new UserError(404, "이 주제로 찾은 최신 자료가 없습니다. 주제를 바꿔 보세요.");
  const blogItemId = typeof body.blogItemId === "string" ? body.blogItemId : null;
  const data: BriefData = { blogItemId, topic, sources, summary: "", terms: [], step: "collected", at: new Date().toISOString() };
  return createItem(userId, "brief", `${todayKst().ymd} ${topic}`, data);
};

/** 2단계: AI 요약 + 자료 속 새 용어 */
export const analyze: Handler = async ({ userId, body }) => {
  const item = await need<BriefData>(userId, body.id, "brief");
  const blog = item.data.blogItemId ? await getItem<BlogData>(userId, item.data.blogItemId, "blog") : null;
  const ai = await aiConfig(userId);
  const r = await generateJson(ai, { system: SYS_JSON("트렌드 분석가"), prompt: trendPrompt(blog?.data.style ?? null, item.data.topic, item.data.sources), maxTokens: 4000 });
  const all = item.data.sources.map((x) => `${x.title} ${x.summary}`).join(" ").replace(/\s+/g, "");
  // 자료에 실제로 나온 용어만 남긴다(띄어쓰기 무시)
  const terms = objArr(r.terms, 10).map((t) => ({ term: str(t.term, 40), why: str(t.why, 200) })).filter((t) => t.term && all.includes(t.term.replace(/\s+/g, "")));
  return updateItem(userId, item.id, { data: { ...item.data, summary: str(r.summary, 2000), terms, step: "analyzed" } });
};

/** 3단계: 검색어 트렌드(최근 14일, 판정은 마지막 10일)로 급상승 판정 + 검색량·문서수 */
export const verify: Handler = async ({ userId, body }) => {
  const item = await need<BriefData>(userId, body.id, "brief");
  if (!item.data.terms.length) throw new UserError(400, "검증할 용어가 없습니다. 먼저 자료 분석을 진행해 주세요.");
  const [naver, ads] = await Promise.all([naverAuth(userId), adsAuth(userId)]);
  const end = new Date(Date.now() + 9 * 3600_000 - 86_400_000); // 어제(한국 시간)
  const start = new Date(end.getTime() - 15 * 86_400_000); // 집계 지연(1~2일)을 감안해 16일 요청
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const terms = item.data.terms.map((t) => ({ ...t }));
  for (let i = 0; i < terms.length; i += 5) {
    const group = terms.slice(i, i + 5);
    const res = await naverTrend(naver, { startDate: ymd(start), endDate: ymd(end), timeUnit: "date", groups: group.map((t) => ({ groupName: t.term, keywords: [t.term] })) });
    for (const t of group) {
      const g = res.find((x) => x.title === t.term);
      const series = g ? fillDays(g.data, start, 16).slice(-14) : [];
      const r = surge(series);
      t.series = series; t.change = r.change; t.surging = r.surging;
    }
  }
  const { metrics } = await keywordMetrics(ads, naver, terms.map((t) => t.term));
  const byKey = new Map(metrics.map((m) => [m.keyword.replace(/\s+/g, ""), m]));
  for (const t of terms) t.metric = byKey.get(t.term.replace(/\s+/g, "")) ?? null;
  terms.sort((a, b) => Number(!!b.surging) - Number(!!a.surging) || (b.change ?? -9) - (a.change ?? -9));
  return updateItem(userId, item.id, { data: { ...item.data, terms, step: "verified" } });
};

/** 날짜별 값(빠진 날은 0). 데이터랩은 최근 1~2일이 아직 집계되지 않아 비어 있으므로, 집계된 마지막 날까지만 쓴다(빈 날을 0으로 채우면 모두 하락으로 보임). */
function fillDays(data: { period: string; ratio: number }[], start: Date, days: number): number[] {
  const map = new Map(data.map((d) => [d.period, d.ratio]));
  const last = data.reduce((m, d) => (d.period > m ? d.period : m), "");
  const out: number[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    if (last && day > last) break;
    out.push(map.get(day) ?? 0);
  }
  return out;
}
