import "server-only";
import { UserError } from "@/lib/errors";
import { generateJson } from "@/lib/ai";
import { adsAuth, aiConfig, naverAuth } from "@/lib/route";
import { keywordMetrics } from "@/lib/metrics";
import { naverSearch } from "@/lib/naver";
import { fetchFeed, fetchPostText, inBatches, parseBlogId, parsePostRef } from "@/lib/blog";
import { SYS_JSON, benchPrompt } from "@/lib/prompts";
import { createItem, getItem, updateItem } from "@/lib/store";
import { objArr, str, strArr } from "@/lib/util";
import type { BenchBlog, BenchData, BlogData } from "@/lib/types";
import { arr, need, s, type Handler } from "./common";

/** 같은 주제를 쓰는 블로그 찾기(블로그 검색 결과를 블로그별로 묶음) */
export const find: Handler = async ({ userId, body }) => {
  const queries = arr(body.queries, 3, 40);
  if (!queries.length) throw new UserError(400, "벤치마킹할 주제를 입력하거나 선택해 주세요.");
  const blog = typeof body.blogItemId === "string" ? await getItem<BlogData>(userId, body.blogItemId, "blog") : null;
  const naver = await naverAuth(userId);
  const results = await Promise.all(queries.map((q) => naverSearch(naver, "blog", q, { display: 50 })));
  const map = new Map<string, BenchBlog>();
  for (const r of results) for (const it of r.items) {
    const id = parsePostRef(it.link)?.blogId ?? (it.bloggerlink ? parseBlogId(it.bloggerlink) : null);
    if (!id || id === blog?.data.blogId) continue;
    const b = map.get(id) ?? { blogId: id, name: it.bloggername || id, hits: 0, sample: it.title };
    b.hits++; map.set(id, b);
  }
  const blogs = [...map.values()].sort((a, b) => b.hits - a.hits).slice(0, 12);
  if (!blogs.length) throw new UserError(404, "이 주제로 찾은 네이버 블로그가 없습니다. 주제를 바꿔 보세요.");
  const data: BenchData = { blogItemId: blog?.id ?? null, topic: queries.join(", "), blogs, analyses: [], watch: [] };
  return createItem(userId, "bench", queries.join(", "), data);
};

/** 고른 블로그 최근 글 분석 → 참고 검색어 + 수치 */
export const analyze: Handler = async ({ userId, body }) => {
  const item = await need<BenchData>(userId, body.id, "bench");
  const blogId = s(body.blogId, 300);
  const id = item.data.blogs.find((b) => b.blogId === blogId)?.blogId ?? parseBlogId(blogId);
  if (!id) throw new UserError(400, "분석할 블로그를 선택하거나 블로그 주소를 입력해 주세요.");
  const feed = await fetchFeed(id);
  if (!feed?.posts.length) throw new UserError(502, "이 블로그의 공개 글 목록을 읽지 못했습니다(비공개이거나 RSS가 꺼져 있을 수 있습니다).");
  const recent = feed.posts.slice(0, 10);
  const texts = await inBatches(recent.slice(0, 3), 3, (p) => fetchPostText(id, p.logNo, 2500));
  const own = item.data.blogItemId ? await getItem<BlogData>(userId, item.data.blogItemId, "blog") : null;
  const [ai, ads, naver] = await Promise.all([aiConfig(userId), adsAuth(userId), naverAuth(userId)]);
  const r = await generateJson(ai, { system: SYS_JSON("블로그 벤치마킹 분석가"), prompt: benchPrompt(own?.data.style ?? null, feed.name || id, recent.map((p, i) => ({ title: p.title, text: texts[i] ?? "" }))), maxTokens: 4000 });
  const kws = objArr(r.keywords, 10).map((k) => ({ keyword: str(k.keyword, 40), why: str(k.why, 200) })).filter((k) => k.keyword);
  const { metrics } = kws.length ? await keywordMetrics(ads, naver, kws.map((k) => k.keyword)) : { metrics: [] };
  const byKey = new Map(metrics.map((m) => [m.keyword.replace(/\s+/g, ""), m]));
  const analysis = { blogId: id, name: feed.name || id, titles: recent.map((p) => p.title), pattern: str(r.pattern, 1000), strengths: strArr(r.strengths, 4, 150), keywords: kws.map((k) => ({ ...k, metric: byKey.get(k.keyword.replace(/\s+/g, "")) ?? null })), at: new Date().toISOString() };
  const analyses = [analysis, ...item.data.analyses.filter((a) => a.blogId !== id)].slice(0, 12);
  return updateItem(userId, item.id, { data: { ...item.data, analyses } });
};
