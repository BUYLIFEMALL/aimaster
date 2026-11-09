// v1.47 V7 해시태그 3단 — 인기(넓은 주제·경쟁 많음)·중간·니치(구체적·경쟁 적음). AI 추정 분류(실제 게시물 수 조회 아님).
// 다른 파일을 불러오지 않는 순수 함수만 둔다(node 시험에서 바로 불러오도록).
export type HashtagTier = "popular" | "mid" | "niche";
export type HashtagTiers = Record<HashtagTier, string[]>;
export const HASHTAG_TIERS: HashtagTier[] = ["popular", "mid", "niche"];

export const asHashtag = (h: string) => (h.startsWith("#") ? h : `#${h}`).replace(/\s+/g, "");

/** AI 응답의 hashtagTiers를 정리한다 — 중복 제거·단계당 4개·전체 10개. 쓸 태그가 없으면 null */
export function readTiers(raw: unknown): { tiers: HashtagTiers; hashtags: string[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const seen = new Set<string>();
  const tiers = {} as HashtagTiers;
  for (const k of HASHTAG_TIERS) {
    const list = (Array.isArray(t[k]) ? (t[k] as unknown[]) : []).map((x) => String(x ?? "").trim().slice(0, 30)).filter(Boolean).map(asHashtag);
    tiers[k] = [];
    for (const h of list) { if (h.length > 1 && !seen.has(h) && tiers[k].length < 4) { seen.add(h); tiers[k].push(h); } }
  }
  const hashtags = HASHTAG_TIERS.flatMap((k) => tiers[k]).slice(0, 10);
  if (!hashtags.length) return null;
  const keep = new Set(hashtags);
  for (const k of HASHTAG_TIERS) tiers[k] = tiers[k].filter((h) => keep.has(h));
  return { tiers, hashtags };
}

/** 회원이 해시태그 칸을 고치면 3단에서 빠진 태그는 지운다(새로 넣은 태그는 단계 없이 목록에만). 모두 빠지면 undefined */
export function keepTiers(tiers: HashtagTiers | undefined, hashtags: string[]): HashtagTiers | undefined {
  if (!tiers) return undefined;
  const keep = new Set(hashtags);
  const next = {} as HashtagTiers;
  for (const k of HASHTAG_TIERS) next[k] = (tiers[k] ?? []).filter((h) => keep.has(h));
  return HASHTAG_TIERS.some((k) => next[k].length) ? next : undefined;
}
