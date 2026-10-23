import "server-only";
import { AiError, generateJson, generateMarkdown } from "@/lib/gemini";
import {
  adsKeywords, autocomplete, naverSearch, naverTrend, NaverError,
  type AdsAuth, type NaverAuth,
} from "./naver";
import {
  blogsStrategyPrompt, competitionPrompt, libraryRunPrompt, newsStrategyPrompt, recommendPrompt,
  relatedPrompt, relatedStrategyPrompt, sustainablePrompt, topicsPrompt, trendPrompt,
} from "./prompts";
import { findPrompt } from "./library";
import { fillTemplate, frequentWords, num, obj, objArr, str, strArr, todayKst, trendDelta } from "./util";
import type {
  AutocompleteResult, BlogPost, BlogsResult, CompetitionResult, NewsResult, PromptResult,
  RecommendResult, RelatedResult, Real, SustainableResult, Suggestion, TrendResult,
} from "./types";

export interface Ctx {
  gemini: string;
  naver: NaverAuth | null;
  ads: AdsAuth | null;
}

function suggestions(v: unknown, max = 10): Suggestion[] {
  return objArr(v, max)
    .map((s) => ({ title: str(s.title, 160), thumbnailCopy: str(s.thumbnailCopy, 40), strategy: str(s.strategy, 600) }))
    .filter((s) => s.title);
}

function daysAgo(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function needNaver(ctx: Ctx): NaverAuth {
  if (!ctx.naver) throw new NaverError("auth", "이 기능은 네이버 Client ID/Secret이 필요합니다. [API키등록·플랫폼연동]에서 본인의 네이버 검색 API 키를 등록해 주세요.", 400);
  return ctx.naver;
}

/** 실측 지표: 검색광고(월간 검색수) + 블로그 문서 수 + 데이터랩 12개월 추이. 실패한 항목은 notes에 이유만 남긴다. */
async function collectReal(ctx: Ctx, keyword: string, opts: { docs?: boolean; trend?: boolean; volume?: boolean }): Promise<Real> {
  const real: Real = {};
  const notes: string[] = [];
  const t = todayKst();
  const jobs: Promise<void>[] = [];
  if (opts.volume && ctx.ads) {
    jobs.push(
      adsKeywords(ctx.ads, keyword)
        .then((list) => {
          const key = keyword.replace(/\s+/g, "");
          const hit = list.find((k) => k.keyword.replace(/\s+/g, "") === key);
          if (hit) { real.monthlyPc = hit.pc; real.monthlyMobile = hit.mobile; real.monthlyTotal = hit.total; real.compIdx = hit.compIdx; }
          else notes.push("검색광고 키워드도구에서 이 키워드의 검색수를 찾지 못했습니다.");
        })
        .catch((e) => { notes.push(e instanceof NaverError ? e.message : "검색광고 조회에 실패했습니다."); }),
    );
  }
  if (opts.docs && ctx.naver) {
    jobs.push(
      naverSearch(ctx.naver, "blog", keyword, { display: 1 })
        .then((r) => { real.blogDocTotal = r.total; })
        .catch((e) => { notes.push(e instanceof NaverError ? e.message : "블로그 문서 수 조회에 실패했습니다."); }),
    );
  }
  if (opts.trend && ctx.naver) {
    jobs.push(
      naverTrend(ctx.naver, { startDate: daysAgo(t.ymd, 365), endDate: t.ymd, timeUnit: "month", groups: [{ groupName: keyword, keywords: [keyword] }] })
        .then((r) => { real.trend = r[0]?.data ?? []; })
        .catch((e) => { notes.push(e instanceof NaverError ? `검색 추이: ${e.message}` : "검색 추이 조회에 실패했습니다."); }),
    );
  }
  await Promise.all(jobs);
  if (notes.length) real.notes = notes;
  return real;
}

function postsFrom(items: { title: string; link: string; description: string; bloggername?: string; postdate?: string }[]): BlogPost[] {
  return items.map((i) => ({ title: i.title, link: i.link, description: i.description, blogger: i.bloggername ?? "", postdate: i.postdate ?? "" }));
}

// ① 자동완성 ------------------------------------------------------------
export async function runAutocomplete(ctx: Ctx, keyword: string, engine: "naver" | "google"): Promise<AutocompleteResult> {
  const [texts, volumes] = await Promise.all([
    autocomplete(engine, keyword),
    ctx.ads
      ? adsKeywords(ctx.ads, keyword)
          .then((list) => new Map(list.map((k) => [k.keyword.replace(/\s+/g, ""), { total: k.total, comp: k.compIdx }])))
          // 검색수는 부가 정보: 실패해도 자동완성 결과는 그대로 보여 준다
          .catch(() => new Map<string, { total: number; comp: string | null }>())
      : Promise.resolve(new Map<string, { total: number; comp: string | null }>()),
  ]);
  return {
    kind: "autocomplete",
    engine,
    keyword,
    keywords: texts.map((text) => {
      const v = volumes.get(text.replace(/\s+/g, ""));
      return { text, ...(v ? { monthlyTotal: v.total, compIdx: v.comp } : {}) };
    }),
    topics: null,
  };
}

export async function runTopics(ctx: Ctx, keyword: string, keywords: string[], mode: "main" | "all"): Promise<Suggestion[]> {
  const p = topicsPrompt(mode, keyword, keywords);
  const out = await generateJson({ apiKey: ctx.gemini, system: p.system, user: p.user, schema: p.schema, temperature: 0.8 });
  return suggestions(out.data.suggestions);
}

// ② 연관검색어 ----------------------------------------------------------
export async function runRelated(ctx: Ctx, keyword: string): Promise<RelatedResult> {
  const p = relatedPrompt(keyword);
  const out = await generateJson({ apiKey: ctx.gemini, system: p.system, user: p.user, grounded: true, temperature: 0.2 });
  const relatedSearches = objArr(out.data.relatedSearches, 10).map((r) => ({ keyword: str(r.keyword, 80), reason: str(r.reason, 300) })).filter((r) => r.keyword);
  const peopleAlsoAsk = objArr(out.data.peopleAlsoAsk, 5)
    .map((r) => ({ question: str(r.question, 200), answer: str(r.answer, 800), gap: str(r.gap, 400) }))
    .filter((r) => r.question);
  const contentGap = str(out.data.contentGap, 1500);
  if (!relatedSearches.length && !peopleAlsoAsk.length) throw new AiError("parse");

  let strategy: RelatedResult["strategy"] = null;
  try {
    const sp = relatedStrategyPrompt(keyword, { relatedSearches, peopleAlsoAsk, contentGap });
    const s = await generateJson({ apiKey: ctx.gemini, system: sp.system, user: sp.user, schema: sp.schema, temperature: 0.7 });
    const pillar = obj(s.data.pillarPost);
    strategy = {
      userIntent: str(s.data.userIntent, 1000),
      pillarPost: { title: str(pillar.title, 200), outline: strArr(pillar.outline, 8, 200) },
      suggestions: suggestions(s.data.suggestions),
    };
  } catch (e) {
    // 조사 결과는 이미 확보했으므로 전략 단계 실패만으로 전체를 버리지 않는다(키·한도 오류는 그대로 올린다).
    if (!(e instanceof AiError)) throw e;
  }
  return { kind: "related", keyword, relatedSearches, peopleAlsoAsk, contentGap, strategy, sources: out.sources };
}

// ③ 상위 블로그 ---------------------------------------------------------
export async function runBlogs(ctx: Ctx, keyword: string): Promise<BlogsResult> {
  const naver = needNaver(ctx);
  const [search, real] = await Promise.all([
    naverSearch(naver, "blog", keyword, { display: 10, sort: "sim" }),
    collectReal(ctx, keyword, { volume: true }),
  ]);
  if (!search.items.length) throw new NaverError("http", "네이버에서 이 키워드의 블로그 글을 찾지 못했습니다. 다른 키워드로 시도해 주세요.", 404);
  real.blogDocTotal = search.total;
  const posts = postsFrom(search.items);
  const p = blogsStrategyPrompt(keyword, posts);
  const out = await generateJson({ apiKey: ctx.gemini, system: p.system, user: p.user, schema: p.schema, temperature: 0.6 });
  const a = obj(out.data.analysis);
  return {
    kind: "blogs",
    keyword,
    posts,
    analysis: { structure: str(a.structure, 1500), characteristics: str(a.characteristics, 1500), commonKeywords: strArr(a.commonKeywords, 12, 40) },
    suggestions: suggestions(out.data.suggestions),
    real,
  };
}

// ④ 키워드 경쟁력 -------------------------------------------------------
export async function runCompetition(ctx: Ctx, keyword: string): Promise<CompetitionResult> {
  const real = await collectReal(ctx, keyword, { docs: true, volume: true, trend: true });
  const p = competitionPrompt(keyword, { blogDocTotal: real.blogDocTotal, monthlyTotal: real.monthlyTotal });
  const out = await generateJson({ apiKey: ctx.gemini, system: p.system, user: p.user, grounded: true, temperature: 0.2 });
  const d = out.data;
  const a = obj(d.analysis);
  const st = obj(d.strategy);
  const score = num(d.opportunityScore, 0, 100, -1);
  if (score < 0 || !str(a.conclusion)) throw new AiError("parse");
  const level = str(d.competitionLevel, 10);
  const hasStrategy = Object.keys(st).length > 0 && (Array.isArray(st.expandedKeywords) || Array.isArray(st.blogTopics));
  return {
    kind: "competition",
    keyword,
    opportunityScore: score,
    searchInterestIndex: num(d.searchInterestIndex),
    competitionIndex: num(d.competitionIndex),
    competitionLevel: ["낮음", "중간", "높음"].includes(level) ? level : "중간",
    documentCount: real.blogDocTotal != null ? `${real.blogDocTotal.toLocaleString("ko-KR")}건(네이버 블로그 실측)` : str(d.documentCount, 60) || "추정 불가",
    analysis: {
      title: str(a.title, 200), reason: str(a.reason, 1500), opportunity: str(a.opportunity, 1500),
      threat: str(a.threat, 1500), consumption: str(a.consumption, 1500), conclusion: str(a.conclusion, 2000),
    },
    strategy: hasStrategy
      ? { expandedKeywords: strArr(st.expandedKeywords, 6, 60), blogTopics: suggestions(st.blogTopics, 5) }
      : null,
    real,
    sources: out.sources,
  };
}

// ⑤ 오늘의 전략 키워드 --------------------------------------------------
export async function runRecommend(ctx: Ctx): Promise<RecommendResult> {
  const p = recommendPrompt();
  const out = await generateJson({ apiKey: ctx.gemini, system: p.system, user: p.user, grounded: true, temperature: 0.3 });
  const items = objArr(out.data.items, 10)
    .map((i) => ({
      keyword: str(i.keyword, 80), category: str(i.category, 20) || "이슈", reason: str(i.reason, 600),
      title: str(i.title, 160), thumbnailCopy: str(i.thumbnailCopy, 40), strategy: str(i.strategy, 600),
    }))
    .filter((i) => i.keyword);
  if (!items.length) throw new AiError("parse");
  return { kind: "recommend", date: todayKst().ymd, items, sources: out.sources };
}

// ⑥ 다각도 주제 발굴 ----------------------------------------------------
export async function runSustainable(ctx: Ctx, keyword: string): Promise<SustainableResult> {
  const p = sustainablePrompt(keyword);
  const out = await generateJson({ apiKey: ctx.gemini, system: p.system, user: p.user, schema: p.schema, temperature: 0.8, maxOutputTokens: 16384 });
  const categories = objArr(out.data.categories, 4).map((c) => ({
    name: str(c.name, 60),
    description: str(c.description, 400),
    topics: objArr(c.topics, 10)
      .map((t) => ({ title: str(t.title, 200), keywords: strArr(t.keywords, 6, 40), seoStrategy: str(t.seoStrategy, 600) }))
      .filter((t) => t.title),
  })).filter((c) => c.name && c.topics.length);
  if (!categories.length) throw new AiError("parse");
  return { kind: "sustainable", keyword, categories };
}

// ⑦ 뉴스 ---------------------------------------------------------------
export async function runNews(ctx: Ctx, keyword: string): Promise<NewsResult> {
  const naver = needNaver(ctx);
  const search = await naverSearch(naver, "news", keyword, { display: 10, sort: "date" });
  if (!search.items.length) throw new NaverError("http", "네이버에서 이 키워드의 최신 뉴스를 찾지 못했습니다. 다른 키워드로 시도해 주세요.", 404);
  const items = search.items.map((i) => ({ title: i.title, link: i.originallink || i.link, description: i.description, pubDate: i.pubDate ?? "" }));
  const p = newsStrategyPrompt(keyword, items);
  const out = await generateJson({ apiKey: ctx.gemini, system: p.system, user: p.user, schema: p.schema, temperature: 0.6 });
  const a = obj(out.data.analysis);
  return {
    kind: "news",
    keyword,
    items,
    analysis: { coreIssue: str(a.coreIssue, 1200), userInterestPoint: str(a.userInterestPoint, 1200), opportunity: str(a.opportunity, 1200) },
    suggestions: suggestions(out.data.suggestions),
  };
}

// ⑧ 카테고리 트렌드 ----------------------------------------------------
export async function runTrend(ctx: Ctx, category: string): Promise<TrendResult> {
  const naver = needNaver(ctx);
  const search = await naverSearch(naver, "blog", category, { display: 100, sort: "date" });
  if (!search.items.length) throw new NaverError("http", "이 분야의 최신 블로그 글을 찾지 못했습니다. 분야 이름을 바꿔 시도해 주세요.", 404);
  const posts = postsFrom(search.items);
  const base = frequentWords(posts.map((p) => p.title), [category], 10);

  const t = todayKst();
  let series: { word: string; data: { period: string; ratio: number }[] }[] = [];
  const notes: string[] = [];
  const top = base.slice(0, 5);
  if (top.length) {
    try {
      const groups = await naverTrend(naver, {
        startDate: daysAgo(t.ymd, 84), endDate: t.ymd, timeUnit: "week",
        groups: top.map((f) => ({ groupName: f.word, keywords: [f.word] })),
      });
      series = groups.map((g) => ({ word: g.title, data: g.data }));
    } catch (e) {
      notes.push(e instanceof NaverError ? `검색 추이: ${e.message}` : "검색 추이 조회에 실패했습니다.");
    }
  }
  const delta = new Map(series.map((s) => [s.word, trendDelta(s.data)]));
  const frequent = base.map((f) => ({ ...f, trendDelta: delta.has(f.word) ? delta.get(f.word) ?? null : null }));

  const p = trendPrompt(category, posts.map((x) => x.title), frequent);
  const out = await generateJson({ apiKey: ctx.gemini, system: p.system, user: p.user, schema: p.schema, temperature: 0.7 });
  return {
    kind: "trend",
    keyword: category,
    posts: posts.slice(0, 20),
    frequent,
    trendSeries: series,
    keywordBased: suggestions(out.data.keywordBased, 5),
    analysisBased: suggestions(out.data.analysisBased, 5),
    summary: str(out.data.summary, 1500),
    real: notes.length ? { notes } : {},
  };
}

// 프롬프트 라이브러리 --------------------------------------------------
export async function runPrompt(ctx: Ctx, keyword: string, promptId: string): Promise<PromptResult> {
  const lib = findPrompt(promptId);
  if (!lib) throw new AiError("parse", "알 수 없는 프롬프트입니다.");
  const p = libraryRunPrompt(fillTemplate(lib.text, { keyword }), keyword);
  const out = await generateMarkdown({ apiKey: ctx.gemini, system: p.system, user: p.user, grounded: true, temperature: 0.5 });
  return { kind: "prompt", keyword, promptId: lib.id, promptTitle: lib.title, markdown: out.markdown, sources: out.sources };
}
