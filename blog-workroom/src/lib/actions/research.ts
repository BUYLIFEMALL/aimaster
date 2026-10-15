import "server-only";
import { UserError } from "@/lib/errors";
import { generateJson } from "@/lib/ai";
import { aiConfig, naverAuth } from "@/lib/route";
import { naverSearch } from "@/lib/naver";
import { fetchBlogUrlText, inBatches, parsePostRef } from "@/lib/blog";
import { copiesSource, quoteInText } from "@/lib/logic";
import { SYS_JSON, researchPrompt } from "@/lib/prompts";
import { createItem, getItem, updateItem } from "@/lib/store";
import { num, objArr, str, strArr } from "@/lib/util";
import type { BlogData, KnowledgePoint, ResearchData } from "@/lib/types";
import { need, s, type Handler } from "./common";

/** 새 글 작성 준비 시작(보관 키워드 또는 직접 입력) */
export const create: Handler = async ({ userId, body }) => {
  const keyword = s(body.keyword, 40);
  if (!keyword) throw new UserError(400, "글을 쓸 키워드를 선택하거나 입력해 주세요.");
  const blogItemId = typeof body.blogItemId === "string" ? body.blogItemId : null;
  const data: ResearchData = { blogItemId, keyword, query: keyword, related: [], sources: [], news: [], points: [], angle: "", gaps: [], approved: false, approvedAt: null, step: "picked" };
  return createItem(userId, "research", keyword, data);
};

/** 고른 검색어의 상위 블로그 글 5개 + 관련 뉴스 5개 확보 */
export const collect: Handler = async ({ userId, body }) => {
  const item = await need<ResearchData>(userId, body.id, "research");
  const query = s(body.query, 40) || item.data.query;
  const naver = await naverAuth(userId);
  const [blogs, news] = await Promise.all([
    naverSearch(naver, "blog", query, { display: 15, sort: "sim" }),
    naverSearch(naver, "news", query, { display: 5, sort: "sim" }).catch(() => ({ total: 0, items: [] })),
  ]);
  // 네이버 블로그 글만(본문을 읽을 수 있는 것), 상위 5개
  const top = blogs.items.filter((it) => parsePostRef(it.link)).slice(0, 5);
  if (!top.length) throw new UserError(404, "이 검색어의 네이버 블로그 상위 글을 찾지 못했습니다. 다른 검색어를 골라 주세요.");
  const texts = await inBatches(top, 5, (it) => fetchBlogUrlText(it.link, 5000));
  const sources = top.map((it, i) => ({ title: it.title, link: it.link, blogger: it.bloggername ?? "", text: texts[i] ?? it.description, ok: !!texts[i] }));
  const newsList = news.items.map((n) => ({ kind: "뉴스" as const, title: n.title, link: n.originallink || n.link, date: n.pubDate ? new Date(n.pubDate).toISOString() : "", summary: n.description }));
  return updateItem(userId, item.id, { title: query, data: { ...item.data, query, sources, news: newsList, points: [], approved: false, approvedAt: null, step: "collected" } });
};

/** AI 사전 지식 정리: 근거 구절이 실제 자료에 있는 것만, 원문과 지나치게 같은 문장은 제외 */
export const analyze: Handler = async ({ userId, body }) => {
  const item = await need<ResearchData>(userId, body.id, "research");
  if (!item.data.sources.length) throw new UserError(400, "먼저 상위 글 자료를 확보해 주세요.");
  const blog = item.data.blogItemId ? await getItem<BlogData>(userId, item.data.blogItemId, "blog") : null;
  const ai = await aiConfig(userId);
  const r = await generateJson(ai, { system: SYS_JSON("블로그 자료 조사 담당자"), prompt: researchPrompt(item.data, blog?.data.style ?? null), maxTokens: 8000 });
  const texts = item.data.sources.map((x) => x.text);
  const srcText = (n: number) => (n >= 101 ? `${item.data.news[n - 101]?.title ?? ""} ${item.data.news[n - 101]?.summary ?? ""}` : texts[n - 1] ?? "");
  let dropped = 0;
  const points: KnowledgePoint[] = [];
  for (const p of objArr(r.points, 24)) {
    const text = str(p.text, 300), quote = str(p.quote, 120), source = num(p.source, 1, 105, 0);
    if (!text || !source || !quoteInText(quote, srcText(source)) || copiesSource(text, [...texts, ...item.data.news.map((n) => n.summary)])) { dropped++; continue; }
    points.push({ text, source, quote, kept: true });
  }
  if (!points.length) throw new UserError(502, "자료에서 근거를 확인한 사전 지식을 만들지 못했습니다. 다시 시도하거나 다른 검색어를 골라 주세요.");
  return Object.assign(await updateItem(userId, item.id, { data: { ...item.data, points, angle: str(r.angle, 800), gaps: strArr(r.gaps, 5, 150), approved: false, approvedAt: null, step: "analyzed" } }), { dropped });
};
