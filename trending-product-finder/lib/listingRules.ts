// E2-2 상품명·태그 규칙 검사(순수 함수) — AI 초안이든 회원이 고친 글이든 같은 기준으로 본다.
// 기준: 마켓 공개 안내에서 공통으로 권하는 것(길이·같은 낱말 반복·홍보 문구·꾸밈 기호). 어겨도 막지 않고 알려 주기만 한다.

export type ListingMarket = "coupang" | "naver";

export type RuleIssue = { level: "warn" | "error"; text: string };

/** 마켓별 상품명 길이: 권장(넘으면 주의)·최대(넘으면 등록 안 됨). */
export const TITLE_LIMITS: Record<ListingMarket, { recommend: number; max: number }> = {
  naver: { recommend: 50, max: 100 },
  coupang: { recommend: 50, max: 100 },
};

export const MAX_TAGS = 10;
const TAG_MAX_LEN = 20;

// 검색 품질 기준에서 상품명에 넣지 말라는 홍보·혜택 문구(상품 자체가 아닌 말).
const PROMO_WORDS = ["최저가", "무료배송", "당일발송", "특가", "할인", "세일", "이벤트", "사은품", "증정", "1위", "최고", "베스트", "인기", "추천", "정품"];
const DECOR = /[!@#$%^*~★☆♥♡◆◇■□●○▶◀【】\[\]{}<>|※♬♪]/;

export function cleanText(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function checkTitle(title: string, market: ListingMarket): RuleIssue[] {
  const text = cleanText(title);
  const issues: RuleIssue[] = [];
  if (!text) return [{ level: "error", text: "상품명이 비어 있습니다." }];
  const { recommend, max } = TITLE_LIMITS[market];
  const length = [...text].length;
  if (length > max) issues.push({ level: "error", text: `${length}자 — 최대 ${max}자를 넘습니다.` });
  else if (length > recommend) issues.push({ level: "warn", text: `${length}자 — ${recommend}자 이내를 권장합니다.` });

  const seen = new Map<string, number>();
  for (const word of text.split(" ")) {
    const key = word.toLowerCase();
    if ([...key].length < 2) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const repeated = [...seen].filter(([, n]) => n > 1).map(([w]) => w);
  if (repeated.length) issues.push({ level: "warn", text: `같은 낱말 반복: ${repeated.join(", ")}` });

  const promo = PROMO_WORDS.filter((w) => text.includes(w));
  if (promo.length) issues.push({ level: "warn", text: `홍보 문구: ${promo.join(", ")} — 검색 노출이 불리할 수 있습니다.` });

  if (DECOR.test(text)) issues.push({ level: "warn", text: "꾸밈 기호(★·【】·! 등)는 빼는 것이 좋습니다." });
  return issues;
}

/** 태그: 「#」·띄어쓰기 정리, 같은 태그·상품명과 똑같은 태그·너무 긴 태그 제외, 최대 10개. */
export function cleanTags(tags: string[], title = ""): string[] {
  const titleKey = cleanText(title).replace(/\s/g, "").toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = cleanText(String(raw ?? "").replace(/#/g, "")).replace(/\s/g, "");
    const key = tag.toLowerCase();
    if (!tag || [...tag].length > TAG_MAX_LEN || seen.has(key) || key === titleKey) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}
