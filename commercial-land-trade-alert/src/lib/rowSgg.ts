// 결과 줄·감시 화면 카드의 시·군·구(행정동 경계 파일 이름) 찾기 — 2026-11-19 보완(맥미니 검수 P3).
// 감시 화면 이름은 겹칠 수 있어 줄별 감시 화면 id(rowTargetIds) → sggById를 먼저 쓰고, id 칸이 없는 옛 결과만 이름(sggByWatch)으로 찾는다.
// 시험 tests/keepResult.test.mjs.

export type SggSource = { sggByWatch?: Record<string, string>; sggById?: Record<string, string>; rowTargetIds?: (string | null | undefined)[] };

/** 결과 표 i번째 줄(감시 화면 이름 watchName)의 시·군·구 코드, 없으면 "" */
export function rowSgg(res: SggSource, i: number, watchName: string): string {
  const id = res.rowTargetIds?.[i];
  if (res.sggById && id) return res.sggById[id] ?? "";
  return res.sggByWatch?.[watchName] ?? "";
}

/** 감시 화면 카드(id·이름)의 시·군·구 코드, 없으면 null */
export function targetSgg(res: SggSource | null | undefined, id: string, name: string): string | null {
  if (!res) return null;
  if (res.sggById) return res.sggById[id] ?? null;
  return res.sggByWatch?.[name] ?? null;
}

/** 경계 파일을 받아야 할 시·군·구 목록(중복 없음) */
export function sggList(res: SggSource): string[] {
  return [...new Set([...Object.values(res.sggById ?? {}), ...Object.values(res.sggByWatch ?? {})].filter(Boolean))];
}
