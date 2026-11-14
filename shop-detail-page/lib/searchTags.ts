// E2-4 검색 태그 정리(순수 함수) — 상품소싱 주소 값(tags)과 입력 칸 값을 같은 규칙으로 정리한다.
// 「#」·띄어쓰기 빼기, 같은 태그 한 번, 20자 넘는 것 제외, 최대 10개. 상품소싱 lib/listingRules.ts cleanTags와 같은 규칙.
export const MAX_SEARCH_TAGS = 10;

export function parseSearchTags(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of String(raw ?? "").split(/[,\n]/)) {
    const tag = part.replace(/#/g, "").replace(/\s+/g, "").trim();
    const key = tag.toLowerCase();
    if (!tag || Array.from(tag).length > 20 || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_SEARCH_TAGS) break;
  }
  return out;
}
