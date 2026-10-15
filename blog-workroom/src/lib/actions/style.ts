import "server-only";
import { UserError } from "@/lib/errors";
import { fetchFeed, fetchPostText, inBatches, parseBlogId } from "@/lib/blog";
import { createItem, updateItem, listItems } from "@/lib/store";
import { generateJson } from "@/lib/ai";
import { aiConfig } from "@/lib/route";
import { SYS_JSON, stylePrompt } from "@/lib/prompts";
import { str, strArr } from "@/lib/util";
import type { BlogData, StyleProfile } from "@/lib/types";
import { arr, need, s, type Handler } from "./common";

const DEPTHS = [5, 10, 20, 30];

/** 블로그 등록: 주소·ID(공개 RSS 확인) 또는 글 표본만 */
export const create: Handler = async ({ userId, body }) => {
  const input = s(body.input, 300);
  const samples = arr(body.samples, 10, 8000).filter((x) => x.length >= 40);
  const blogId = input ? parseBlogId(input) : null;
  if (input && !blogId) throw new UserError(400, "네이버 블로그 주소 또는 블로그 ID를 확인해 주세요. 예) https://blog.naver.com/아이디");
  if (!blogId && !samples.length) throw new UserError(400, "블로그 주소를 입력하거나 40자 이상의 글 표본을 붙여 넣어 주세요.");
  let name = s(body.name, 60) || "내 블로그";
  if (blogId) {
    const exists = (await listItems<BlogData>(userId, "blog")).find((b) => b.data.blogId === blogId);
    if (exists) return exists;
    const feed = await fetchFeed(blogId);
    if (!feed || !feed.posts.length) throw new UserError(400, "블로그 공개 글 목록(RSS)을 읽지 못했습니다. 블로그 ID와 공개 설정을 확인하거나 글 표본을 붙여 넣어 주세요.");
    name = feed.name || blogId;
  }
  const data: BlogData = { blogId, name, url: blogId ? `https://blog.naver.com/${blogId}` : null, posts: [], samples, depth: 10, style: null, approved: false, analyzedAt: null, categories: [], subtopics: [], selected: [] };
  return createItem(userId, "blog", name, data);
};

/** 최신 글 N개 수집(본문 포함) */
export const collect: Handler = async ({ userId, body }) => {
  const item = await need<BlogData>(userId, body.id, "blog");
  const depth = DEPTHS.includes(Number(body.depth)) ? Number(body.depth) : 10;
  if (!item.data.blogId) throw new UserError(400, "블로그 주소 없이 등록한 항목입니다. 글 표본으로 분석해 주세요.");
  const feed = await fetchFeed(item.data.blogId);
  if (!feed) throw new UserError(502, "블로그 공개 글 목록(RSS)을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.");
  const picked = feed.posts.slice(0, depth);
  const texts = await inBatches(picked, 5, (p) => fetchPostText(item.data.blogId!, p.logNo, 4000));
  const posts = picked.map((p, i) => ({ title: p.title, link: p.link, date: p.date, category: p.category, text: texts[i] ?? p.summary }));
  return updateItem(userId, item.id, { data: { ...item.data, name: feed.name || item.data.name, posts, depth } });
};

/** 문체·주제·독자 분석 → 승인 대기 */
export const analyze: Handler = async ({ userId, body }) => {
  const item = await need<BlogData>(userId, body.id, "blog");
  if (!item.data.posts.length && !item.data.samples.length) throw new UserError(400, "먼저 최신 글을 수집하거나 글 표본을 붙여 넣어 주세요.");
  const ai = await aiConfig(userId);
  const r = await generateJson(ai, { system: SYS_JSON("블로그 글쓰기 분석가"), prompt: stylePrompt(item.data), maxTokens: 6000 });
  const style: StyleProfile = {
    summary: str(r.summary, 600), tone: str(r.tone, 300), sentence: str(r.sentence, 300), structure: str(r.structure, 300), reader: str(r.reader, 300),
    expressions: strArr(r.expressions, 8, 60), avoid: strArr(r.avoid, 5, 60), topics: strArr(r.topics, 8, 40), strengths: strArr(r.strengths, 4, 120), cautions: strArr(r.cautions, 4, 120),
  };
  if (!style.summary) throw new UserError(502, "분석 결과가 비어 있습니다. 다시 시도해 주세요.");
  const categories = item.data.categories.length ? item.data.categories : strArr(r.categories, 3, 30);
  const subtopics = item.data.subtopics.length ? item.data.subtopics : strArr(r.subtopics, 5, 30);
  return updateItem(userId, item.id, { data: { ...item.data, style, approved: false, analyzedAt: new Date().toISOString(), categories, subtopics, selected: item.data.selected.length ? item.data.selected : subtopics } });
};
