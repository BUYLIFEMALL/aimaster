import "server-only";
// 블로그 병합 묶음 C(2026-10-24): 작업실(blog-workroom actions/keywords.ts·trend.ts·bench.ts)의 키워드 등급 탐색·급상승 검증·블로그 벤치마킹을
// 이 프로그램 흐름(분석 1번 = 기록 1건, 회원 본인 Gemini·네이버 키)으로 옮겼다. 도톨이 v1.3 기능 참고: N9 수치 조회 전 주제 판정(6시간 재사용),
// N8 최근 7일 활동 블로그 우선·관심 블로그 새 글만 분석. 도톨이 코드·지시문은 쓰지 않았다.
import { AiError, generateJson } from "@/lib/gemini";
import { recentResults } from "@/lib/reports";
import { fetchFeed, fetchPostText, inBatches, parseBlogId, parsePostRef } from "./blogFeed";
import { fillDays, judgeFresh, keyNorm, pickNewPosts, postedWithinDays, sortMetrics, splitTopics, surge, type KeywordMetric } from "./grade";
import { keywordMetrics, shortRelated } from "./metrics";
import { naverSearch, naverTrend, NaverError, type AdsAuth, type NaverAuth } from "./naver";
import { benchmarkPrompt, discoverSeedPrompt, judgePrompt, surgeTermsPrompt } from "./prompts";
import { objArr, str, strArr } from "./util";
import type { BenchAnalysis, BenchBlog, BenchmarkResult, CandidateSource, DiscoverResult, SurgeResult, SurgeTerm } from "./types";

export interface MergeCtx { userId: string; gemini: string; naver: NaverAuth | null; ads: AdsAuth | null }

function needNaver(ctx: MergeCtx): NaverAuth {
  if (!ctx.naver) throw new NaverError("auth", "이 기능은 네이버 Client ID/Secret이 필요합니다. [API키등록·플랫폼연동]에서 본인의 네이버 검색 API 키를 등록해 주세요.", 400);
  return ctx.naver;
}
function needAds(ctx: MergeCtx): AdsAuth {
  if (!ctx.ads) throw new NaverError("auth", "키워드 등급은 월 검색량이 필요해 본인 네이버 검색광고 API(라이선스·비밀키·고객 ID)가 있어야 합니다. [API키등록·플랫폼연동]에서 등록해 주세요.", 400);
  return ctx.ads;
}

// ---- C-1 키워드 등급 탐색 ----
export async function runDiscover(ctx: MergeCtx, keyword: string, params: Record<string, unknown>): Promise<DiscoverResult> {
  const naver = needNaver(ctx), ads = needAds(ctx);
  if (params.mode === "list") {
    // 직접 입력: AI 없이 수치·등급만(최대 20개)
    const list = (Array.isArray(params.keywords) ? params.keywords : []).map((k) => str(k, 40)).filter(Boolean).slice(0, 20);
    if (!list.length) throw new NaverError("http", "분석할 검색어를 줄마다 하나씩 넣어 주세요(최대 20개).", 400);
    const { metrics } = await keywordMetrics(ads, naver, list);
    return { kind: "discover", keyword: `직접 입력 ${list.length}개`, mode: "list", candidates: metrics.map((m) => ({ ...m, reason: "", source: "직접 입력" as CandidateSource })), judged: null, notes: [] };
  }
  const topics = splitTopics(keyword);
  if (!topics.length) throw new NaverError("http", "주제를 입력해 주세요.", 400);
  const notes: string[] = [];
  // 1) AI 후보
  const sp = discoverSeedPrompt(topics);
  const seedOut = await generateJson({ apiKey: ctx.gemini, system: sp.system, user: sp.user, schema: sp.schema, temperature: 0.6 });
  const seeds = objArr(seedOut.data.seeds, 12).map((x) => ({ keyword: str(x.keyword, 40), why: str(x.why, 200) })).filter((x) => x.keyword);
  if (!seeds.length) throw new AiError("parse");
  const first = await keywordMetrics(ads, naver, seeds.map((s) => s.keyword), { withRelated: true });
  // 2) 연관어 후보(검색 100 이상, 후보·자기 자신 제외) — 수치 조회 전에 주제 판정
  const seedSet = new Set(seeds.map((s) => keyNorm(s.keyword)));
  const pool = [...first.related, ...(await shortRelated(ads, topics))]
    .filter((k) => k.total >= 100 && !seedSet.has(keyNorm(k.keyword)))
    .sort((a, b) => b.total - a.total);
  const relatedWords = [...new Map(pool.map((k) => [keyNorm(k.keyword), k.keyword])).values()].slice(0, 30);
  const topicKey = topics.map(keyNorm).sort().join("|");
  let judged: DiscoverResult["judged"] = null;
  let fit: string[] = [];
  if (relatedWords.length) {
    // 도톨이 N9: 같은 주제 판정이 6시간 안에 있으면 다시 쓰고, 처음 보는 검색어만 판정
    const since = new Date(Date.now() - 6 * 3600_000).toISOString();
    const prev = (await recentResults(ctx.userId, "discover", since, 10)).map((r) => r.result)
      .find((r) => r.kind === "discover" && r.judged && keyNorm(r.judged.topic) === topicKey && judgeFresh(r.judged.at));
    const known = prev?.kind === "discover" && prev.judged ? prev.judged : null;
    const knownFit = new Set((known?.fit ?? []).map(keyNorm)), knownUnfit = new Set((known?.unfit ?? []).map(keyNorm));
    const unknown = relatedWords.filter((w) => !knownFit.has(keyNorm(w)) && !knownUnfit.has(keyNorm(w)));
    let newFit = new Set<string>();
    if (unknown.length) {
      const jp = judgePrompt(topics, unknown);
      const jOut = await generateJson({ apiKey: ctx.gemini, system: jp.system, user: jp.user, schema: jp.schema, temperature: 0.1 });
      newFit = new Set(strArr(jOut.data.fit, 30, 60).map(keyNorm));
    }
    fit = relatedWords.filter((w) => knownFit.has(keyNorm(w)) || newFit.has(keyNorm(w)));
    const unfit = relatedWords.filter((w) => !fit.includes(w));
    judged = { at: known && !unknown.length ? known.at : new Date().toISOString(), topic: topicKey, fit, unfit, reused: Boolean(known) };
    if (known) notes.push(unknown.length ? `주제 판정: ${relatedWords.length - unknown.length}개는 6시간 안의 판정을 다시 썼고 ${unknown.length}개만 새로 판정했습니다.` : "주제 판정: 6시간 안의 판정을 그대로 다시 썼습니다(AI 호출 없음).");
  }
  // 3) 주제에 맞는 연관어만 수치 조회(최대 15)
  const extra = fit.slice(0, 15);
  const more = extra.length ? (await keywordMetrics(ads, naver, extra)).metrics : [];
  const why = new Map(seeds.map((s) => [keyNorm(s.keyword), s.why]));
  const all = sortMetrics([...first.metrics, ...more].filter((m, i, a) => a.findIndex((x) => keyNorm(x.keyword) === keyNorm(m.keyword)) === i));
  return {
    kind: "discover", keyword: topics.join(", "), mode: "topic",
    candidates: all.map((m) => ({ ...m, reason: why.get(keyNorm(m.keyword)) ?? "검색광고 연관 검색어(주제 판정 통과)", source: (why.has(keyNorm(m.keyword)) ? "AI 후보" : "연관어") as CandidateSource })),
    judged, notes,
  };
}

// ---- C-2 급상승 검증 ----
export async function runSurge(ctx: MergeCtx, topic: string): Promise<SurgeResult> {
  const naver = needNaver(ctx);
  const notes: string[] = [];
  const [news, web] = await Promise.all([
    naverSearch(naver, "news", topic, { display: 10, sort: "date" }),
    naverSearch(naver, "webkr", topic, { display: 10 }).catch(() => ({ total: 0, items: [] })),
  ]);
  const sources = [
    ...news.items.map((n) => ({ kind: "뉴스" as const, title: n.title, link: n.originallink || n.link, date: n.pubDate ? new Date(n.pubDate).toISOString() : "", summary: n.description })),
    ...web.items.map((w) => ({ kind: "웹" as const, title: w.title, link: w.link, date: "", summary: w.description })),
  ];
  if (!sources.length) throw new NaverError("http", "이 주제로 찾은 최신 자료가 없습니다. 주제를 바꿔 보세요.", 404);
  const p = surgeTermsPrompt(topic, sources);
  const out = await generateJson({ apiKey: ctx.gemini, system: p.system, user: p.user, schema: p.schema, temperature: 0.4 });
  // 자료에 실제로 나온 용어만 남긴다(띄어쓰기 무시) — 작업실 규칙 그대로
  const all = sources.map((s) => `${s.title} ${s.summary}`).join(" ").replace(/\s+/g, "");
  const terms: SurgeTerm[] = objArr(out.data.terms, 10).map((t) => ({ term: str(t.term, 40), why: str(t.why, 200) }))
    .filter((t) => t.term && all.includes(t.term.replace(/\s+/g, "")))
    .map((t) => ({ ...t, series: [], change: null, surging: false, metric: null }));
  if (terms.length) {
    const end = new Date(Date.now() + 9 * 3600_000 - 86_400_000); // 어제(한국 시간)
    const start = new Date(end.getTime() - 15 * 86_400_000); // 집계 지연(1~2일) 감안해 16일 요청
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    try {
      for (let i = 0; i < terms.length; i += 5) {
        const group = terms.slice(i, i + 5);
        const res = await naverTrend(naver, { startDate: ymd(start), endDate: ymd(end), timeUnit: "date", groups: group.map((t) => ({ groupName: t.term, keywords: [t.term] })) });
        for (const t of group) {
          const g = res.find((x) => x.title === t.term);
          t.series = g ? fillDays(g.data, start, 16).slice(-14) : [];
          const r = surge(t.series);
          t.change = r.change; t.surging = r.surging;
        }
      }
    } catch (e) { notes.push(e instanceof NaverError ? `검색 추이: ${e.message}` : "검색 추이 조회에 실패했습니다."); }
    if (ctx.ads) {
      const { metrics } = await keywordMetrics(ctx.ads, naver, terms.map((t) => t.term));
      const byKey = new Map(metrics.map((m) => [keyNorm(m.keyword), m]));
      for (const t of terms) t.metric = byKey.get(keyNorm(t.term)) ?? null;
    } else notes.push("검색광고 키가 없어 월 검색량·등급은 생략했습니다(급상승 판정은 데이터랩 추이로 함).");
    terms.sort((a, b) => Number(b.surging) - Number(a.surging) || (b.change ?? -9) - (a.change ?? -9));
  } else notes.push("자료에서 검색할 만한 새 용어를 찾지 못했습니다.");
  return { kind: "surge", keyword: topic, sources: sources.map(({ kind, title, link, date }) => ({ kind, title, link, date })), summary: str(out.data.summary, 2000), terms, notes };
}

// ---- C-3 블로그 벤치마킹 ----
async function watchedBlogs(userId: string): Promise<Map<string, BenchAnalysis | null>> {
  const rows = await recentResults(userId, "benchmark", new Date(0).toISOString(), 30);
  const watched = new Map<string, BenchAnalysis | null>();
  for (const r of rows) {
    if (r.result.kind !== "benchmark") continue;
    for (const id of r.result.watch) if (!watched.has(id)) watched.set(id, r.result.analyses.find((a) => a.blogId === id) ?? null);
  }
  return watched;
}

/** 같은 주제를 쓰는 블로그 찾기(AI 없음). 도톨이 N8: 최근 7일 안에 관련 글을 쓴 블로그를 앞에. */
export async function runBenchmarkFind(ctx: MergeCtx, keyword: string): Promise<BenchmarkResult> {
  const naver = needNaver(ctx);
  const topics = splitTopics(keyword);
  if (!topics.length) throw new NaverError("http", "주제를 입력해 주세요.", 400);
  const results = await Promise.all(topics.map((q) => naverSearch(naver, "blog", q, { display: 50 })));
  const map = new Map<string, BenchBlog>();
  for (const r of results) for (const it of r.items) {
    const id = parsePostRef(it.link)?.blogId ?? (it.bloggerlink ? parseBlogId(it.bloggerlink) : null);
    if (!id) continue;
    const b = map.get(id) ?? { blogId: id, name: it.bloggername || id, hits: 0, sample: it.title, recent: false };
    b.hits++; if (postedWithinDays(it.postdate)) b.recent = true;
    map.set(id, b);
  }
  const watched = await watchedBlogs(ctx.userId);
  const blogs = [...map.values()].sort((a, b) => Number(watched.has(b.blogId)) - Number(watched.has(a.blogId)) || Number(b.recent) - Number(a.recent) || b.hits - a.hits).slice(0, 12);
  if (!blogs.length) throw new NaverError("http", "이 주제로 찾은 네이버 블로그가 없습니다. 주제를 바꿔 보세요.", 404);
  return { kind: "benchmark", keyword: topics.join(", "), blogs, analyses: [], watch: blogs.filter((b) => watched.has(b.blogId)).map((b) => b.blogId) };
}

/** 고른 블로그 최근 글 분석 → 참고 검색어 + 수치. 도톨이 N8: 이전에 분석한 글은 건너뛰고 새 글만(새 글이 없으면 AI 호출 없음). */
export async function runBenchmarkAnalyze(ctx: MergeCtx, current: BenchmarkResult, blogInput: string): Promise<BenchmarkResult> {
  const naver = needNaver(ctx);
  const id = current.blogs.find((b) => b.blogId === blogInput)?.blogId ?? parseBlogId(blogInput);
  if (!id) throw new NaverError("http", "분석할 블로그를 고르거나 블로그 주소를 넣어 주세요.", 400);
  const feed = await fetchFeed(id);
  if (!feed?.posts.length) throw new NaverError("http", "이 블로그의 공개 글 목록을 읽지 못했습니다(비공개이거나 RSS가 꺼져 있을 수 있습니다).", 502);
  const previous = current.analyses.find((a) => a.blogId === id) ?? (await watchedBlogs(ctx.userId)).get(id) ?? null;
  const fresh = pickNewPosts(feed.posts, previous?.seenLogNos, 10);
  const at = new Date().toISOString();
  let analysis: BenchAnalysis;
  if (previous && !fresh.length) {
    analysis = { ...previous, at, newCount: 0, noNew: true };
  } else {
    const texts = await inBatches(fresh.slice(0, 3), 3, (p) => fetchPostText(id, p.logNo, 2500));
    const p = benchmarkPrompt(feed.name || id, fresh.map((x, i) => ({ title: x.title, text: texts[i] ?? "" })));
    const out = await generateJson({ apiKey: ctx.gemini, system: p.system, user: p.user, schema: p.schema, temperature: 0.4 });
    const kws = objArr(out.data.keywords, 10).map((k) => ({ keyword: str(k.keyword, 40), why: str(k.why, 200) })).filter((k) => k.keyword);
    let byKey = new Map<string, KeywordMetric>();
    if (ctx.ads && kws.length) byKey = new Map((await keywordMetrics(ctx.ads, naver, kws.map((k) => k.keyword))).metrics.map((m) => [keyNorm(m.keyword), m]));
    analysis = {
      blogId: id, name: feed.name || id, titles: fresh.map((x) => x.title), pattern: str(out.data.pattern, 1000), strengths: strArr(out.data.strengths, 4, 150),
      keywords: kws.map((k) => ({ ...k, metric: byKey.get(keyNorm(k.keyword)) ?? null })), at,
      seenLogNos: [...new Set([...fresh.map((x) => x.logNo), ...(previous?.seenLogNos ?? [])])].slice(0, 200),
      newCount: previous ? fresh.length : 0,
    };
  }
  const blogs = current.blogs.some((b) => b.blogId === id) ? current.blogs : [{ blogId: id, name: feed.name || id, hits: 0, sample: feed.posts[0]?.title ?? "", recent: false }, ...current.blogs];
  return { ...current, blogs, analyses: [analysis, ...current.analyses.filter((a) => a.blogId !== id)].slice(0, 12) };
}

/** 관심 블로그 표시·해제(다음 벤치마킹 때 맨 앞에, 새 글만 분석) */
export function setBenchmarkWatch(current: BenchmarkResult, blogId: string, on: boolean): BenchmarkResult {
  const watch = on ? [...new Set([...current.watch, blogId])] : current.watch.filter((x) => x !== blogId);
  return { ...current, watch };
}
