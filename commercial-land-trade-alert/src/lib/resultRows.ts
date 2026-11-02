// 결과 표와 통계 칸의 순수 계산(시험 대상).

export type RowGroup<T> = { row: T; rest: T[] };

/** 같은 열쇠의 줄을 첫 줄에 묶는다. 순서는 각 묶음의 첫 줄 순서를 따른다 */
export function groupSameRows<T>(rows: T[], keyOf: (row: T) => string): RowGroup<T>[] {
  const groups = new Map<string, RowGroup<T>>();
  for (const row of rows) {
    const key = keyOf(row);
    const g = groups.get(key);
    if (g) g.rest.push(row);
    else groups.set(key, { row, rest: [] });
  }
  return [...groups.values()];
}

type SnapLike = { groups: { watch: string; total: number }[] };

/** 직전 회차 대비 매물 수 차이. 감시 화면 구성이 다르면 견줄 수 없어 null */
export function totalDelta(latest: SnapLike, prev: SnapLike | null): number | null {
  if (!prev) return null;
  const watches = (s: SnapLike) => [...new Set(s.groups.map((g) => g.watch))].sort().join("\n");
  if (watches(latest) !== watches(prev)) return null;
  const sum = (s: SnapLike) => s.groups.reduce((n, g) => n + g.total, 0);
  return sum(latest) - sum(prev);
}
