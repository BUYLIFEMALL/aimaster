// 플레이리스트 곡 순서 규칙 — 원본 boks-music `src/TrackOrderList.tsx`(MIT, © 2026 boksajang)의 규칙을 옮김(2026-11-06).
// 순수 함수 — 시험 tests/trackOrder.test.mjs.

const collator = new Intl.Collator(["ko", "en"], { numeric: true, sensitivity: "base" });

export const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/** id를 to번째 자리(0부터)로 옮긴 새 순서. 범위를 넘으면 맨 앞·맨 끝. */
export function moveTo(order: string[], id: string, to: number): string[] {
  const next = order.filter((x) => x !== id);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, id);
  return next;
}

/** 제목 가나다순(숫자는 크기순) — dir "desc"면 거꾸로 */
export function sortByTitle<T extends { id: string; title: string }>(items: T[], dir: "asc" | "desc"): string[] {
  return [...items].sort((a, b) => collator.compare(a.title || "", b.title || "") * (dir === "asc" ? 1 : -1)).map((t) => t.id);
}

/** 고른 곡을 빼거나(remove) 뒤에 덧붙인(add) 새 순서 — 이미 있는 곡은 두 번 넣지 않는다 */
export const withoutIds = (order: string[], ids: Iterable<string>) => {
  const drop = new Set(ids);
  return order.filter((id) => !drop.has(id));
};
export const appendIds = (order: string[], ids: string[]) => [...order, ...ids.filter((id, i) => !order.includes(id) && ids.indexOf(id) === i)];
