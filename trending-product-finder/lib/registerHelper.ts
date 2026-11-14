// E2-1 등록 정보 도우미 — 이미 모은 검색 표본(상품명·가격·광고 여부)만으로 계산하는 순수 함수.
// 외부 호출·AI 없음. 플랜: docs/PLAN_20261114_E2_REGISTER_HELPER.md

export interface SampleItem {
  name: string;
  price: number | null;
  is_ad: boolean;
}

export interface WordCount {
  word: string;
  count: number; // 이 낱말이 들어간 상품명 수(한 상품명에 여러 번 나와도 1)
  pct: number; // 표본 대비 %, 정수
}

// 숫자로 시작하는 낱말(2개·500ml·1+1 등 수량·용량)과 한 글자는 뺀다 — 상품군을 설명하지 못한다.
export function tokenizeName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, " ")
    .split(" ")
    .filter((word) => word.length >= 2 && !/^\d/.test(word));
}

export function topWords(names: string[], limit = 20): WordCount[] {
  const counts = new Map<string, number>();
  for (const name of names) {
    for (const word of new Set(tokenizeName(name))) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const total = names.length;
  return [...counts.entries()]
    .filter(([, count]) => count >= 2 || total < 5)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count, pct: total ? Math.round((count / total) * 100) : 0 }));
}

export interface PriceStats {
  count: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

// 가까운 순위 방식(값을 만들어 내지 않고 실제 가격 중에서 고름).
function rankValue(sorted: number[], ratio: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(ratio * sorted.length) - 1));
  return sorted[index];
}

export function priceStats(prices: Array<number | null>): PriceStats | null {
  const sorted = prices.filter((p): p is number => typeof p === "number" && p > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return {
    count: sorted.length,
    min: sorted[0],
    q1: rankValue(sorted, 0.25),
    median: rankValue(sorted, 0.5),
    q3: rankValue(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}

export function adShare(items: SampleItem[]): { ads: number; total: number; pct: number } {
  const ads = items.filter((item) => item.is_ad).length;
  return { ads, total: items.length, pct: items.length ? Math.round((ads / items.length) * 100) : 0 };
}

// 연관 키워드가 표본 상품명에 몇 번 쓰였는지 — 띄어쓰기를 무시하고 비교한다(검색광고 키워드는 붙여 쓴다).
export function usedInNames(keyword: string, names: string[]): number {
  const target = keyword.toLowerCase().replace(/\s+/g, "");
  if (!target) return 0;
  return names.filter((name) => name.toLowerCase().replace(/\s+/g, "").includes(target)).length;
}
