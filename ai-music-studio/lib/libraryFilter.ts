// 보관함 거르기 규칙(상태 + 공급자) — 화면과 분리한 순수 함수라 시험으로 확인한다.
export type StatusFilter = "all" | "completed" | "running" | "failed" | "star";

interface Item { provider: string; status: string; options?: Record<string, unknown> | null }

export const isStarred = (g: Item) => g.options?.star === true;

export function matches(g: Item, status: StatusFilter, provider: string): boolean {
  const okStatus = status === "all" || (status === "star" ? isStarred(g) : g.status === status);
  return okStatus && (provider === "all" || g.provider === provider);
}

/** 곡이 있는 공급자만, 많은 순(같으면 이름 순). count는 상태 필터를 적용한 개수 */
export function providerCounts(items: Item[], status: StatusFilter): { id: string; count: number }[] {
  const all = new Map<string, number>();
  for (const g of items) all.set(g.provider, (all.get(g.provider) ?? 0) + (matches(g, status, "all") ? 1 : 0));
  return [...all.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}
