import "server-only";
import { UserError } from "@/lib/errors";
import { generateJson } from "@/lib/ai";
import { adsAuth, aiConfig, naverAuth } from "@/lib/context";
import { keywordMetrics, shortRelated, sortMetrics } from "@/lib/metrics";
import { autocomplete } from "@/lib/naver";
import { SYS_JSON, seedPrompt } from "@/lib/prompts";
import { createItem, getItem, listItems } from "@/lib/store";
import { objArr, str } from "@/lib/util";
import type { BlogData, KeywordData, KeywordMetric } from "@/lib/types";
import { arr, s, type Handler } from "./common";

const norm = (k: string) => k.replace(/\s+/g, "").toLowerCase();

/** 주제·내 스타일로 후보 발굴 → 공식 수치 검증(검색광고 검색량 + 블로그 문서수) */
export const discover: Handler = async ({ userId, body }) => {
  const blog = typeof body.blogItemId === "string" ? await getItem<BlogData>(userId, body.blogItemId, "blog") : null;
  const categories = arr(body.categories, 3, 30);
  const subtopics = arr(body.subtopics, 5, 30);
  if (!categories.length && !subtopics.length) throw new UserError(400, "블로그 카테고리나 세부 주제를 하나 이상 선택해 주세요.");
  const [ai, ads, naver] = await Promise.all([aiConfig(userId), adsAuth(userId), naverAuth(userId)]);
  const saved = (await listItems<KeywordData>(userId, "keyword", { limit: 1000 })).map((k) => k.data.keyword);
  const r = await generateJson(ai, { system: SYS_JSON("네이버 블로그 키워드 기획자"), prompt: seedPrompt(blog?.data.style ?? null, categories, subtopics, saved), maxTokens: 4000 });
  const seeds = objArr(r.seeds, 12).map((x) => ({ keyword: str(x.keyword, 40), why: str(x.why, 200) })).filter((x) => x.keyword);
  if (!seeds.length) throw new UserError(502, "후보 검색어를 만들지 못했습니다. 다시 시도해 주세요.");
  const { metrics, related: rel1 } = await keywordMetrics(ads, naver, seeds.map((x) => x.keyword), { withRelated: true });
  const related = [...rel1, ...(await shortRelated(ads, [...subtopics, ...categories]))];
  // 연관 검색어 중 주제 단어가 들어간 것만 추가 검증(최대 15개)
  const tokens = [...categories, ...subtopics, ...seeds.map((x) => x.keyword)].flatMap((t) => t.split(/\s+/)).filter((t) => t.length >= 2);
  const savedSet = new Set(saved.map(norm));
  const extra = related.filter((k) => k.total >= 100 && tokens.some((t) => k.keyword.includes(t.replace(/\s+/g, ""))) && !savedSet.has(norm(k.keyword)))
    .sort((a, b) => b.total - a.total).slice(0, 15).map((k) => k.keyword);
  const more = extra.length ? (await keywordMetrics(ads, naver, extra)).metrics : [];
  const why = new Map(seeds.map((x) => [norm(x.keyword), x.why]));
  const all = sortMetrics([...metrics, ...more].filter((m, i, a) => a.findIndex((x) => norm(x.keyword) === norm(m.keyword)) === i));
  return { candidates: all.map((m) => ({ ...m, reason: why.get(norm(m.keyword)) ?? "검색광고 연관 검색어", saved: savedSet.has(norm(m.keyword)) })) };
};

/** 직접 입력한 검색어 수치 */
export const metrics: Handler = async ({ userId, body }) => {
  const keywords = arr(body.keywords, 20, 40);
  if (!keywords.length) throw new UserError(400, "분석할 검색어를 입력해 주세요(줄마다 하나, 최대 20개).");
  const [ads, naver] = await Promise.all([adsAuth(userId), naverAuth(userId)]);
  return { metrics: (await keywordMetrics(ads, naver, keywords)).metrics };
};

/** 보관함에 저장(이미 있으면 건너뜀) */
export const save: Handler = async ({ userId, body }) => {
  const list = objArr(body.items, 50);
  const source = (["탐색", "직접", "트렌드", "벤치마킹"] as const).find((x) => x === body.source) ?? "직접";
  const blogItemId = typeof body.blogItemId === "string" ? body.blogItemId : null;
  const existing = new Set((await listItems<KeywordData>(userId, "keyword", { limit: 1000 })).map((k) => norm(k.data.keyword)));
  let added = 0;
  for (const x of list) {
    const m = x as unknown as KeywordMetric & { reason?: string };
    const kw = s(m.keyword, 40);
    if (!kw || existing.has(norm(kw))) continue;
    const data: KeywordData = { keyword: kw, pc: Number(m.pc) || 0, mobile: Number(m.mobile) || 0, total: Number(m.total) || 0, docs: m.docs == null ? null : Number(m.docs), ratio: m.ratio == null ? null : Number(m.ratio), grade: m.grade, compIdx: m.compIdx ?? null, source, blogItemId, reason: s(m.reason, 200), checkedAt: new Date().toISOString() };
    await createItem(userId, "keyword", kw, data);
    existing.add(norm(kw)); added++;
  }
  return { added };
};

/** 검색어 목록 확보: 자동완성 + 검색광고 연관어(원문 유지) */
export const related: Handler = async ({ userId, body }) => {
  const keyword = s(body.keyword, 40);
  if (!keyword) throw new UserError(400, "검색어를 입력해 주세요.");
  const [ads, naver] = await Promise.all([adsAuth(userId), naverAuth(userId)]);
  const words = keyword.split(/\s+/).filter((w) => w.length >= 2);
  const [auto, rel, short] = await Promise.all([autocomplete("naver", keyword), keywordMetrics(ads, naver, [keyword], { withRelated: true }), shortRelated(ads, [keyword])]);
  const self = norm(keyword);
  const pool = [...rel.related, ...short.filter((k) => words.some((w) => k.keyword.includes(w)))];
  const relWords = [...new Map(pool.filter((k) => norm(k.keyword) !== self).sort((a, b) => b.total - a.total).map((k) => [norm(k.keyword), k.keyword])).values()].slice(0, 15);
  return { keyword, self: rel.metrics[0] ?? null, autocomplete: auto, related: relWords };
};
