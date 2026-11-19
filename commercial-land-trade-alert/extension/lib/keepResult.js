// 일부만 읽은 회차에도 못 읽은 감시 화면의 직전 결과를 결과 화면에 남긴다(2026-11-19, 플랜 docs/PLAN_20261119_PARTIAL_RESULT_KEEP.md).
// 화면 보관용(lastResult)에만 쓴다 — 알림·기록·수익률·상태 보고·비교 기준(states)에는 넣지 않는다.
// 감시 화면 이름은 겹칠 수 있어(표 name 비고유) 줄별 감시 화면 id(rowTargetIds)로만 묶는다. 옛 모양(id 없음)은 추측하지 않고 통째 교체.
// 주인님 결정(2026-11-19): 보존 기한 7일, 상한·막힘·오류로 못 읽은 화면 모두 보존.

export const KEEP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_TABLE_ROWS = 2000;

const URL_COL = "네이버 매물 주소";
const WATCH_COL = "감시 화면";

function articleNoOf(url) {
  try {
    return new URL(url).searchParams.get("articleNo") || null;
  } catch {
    return null;
  }
}

/**
 * prev: 직전 lastResult(없거나 옛 모양일 수 있음)
 * next: 이번 회차 { table, rowTargetIds, places, sggByWatch, perTarget:[{ id, name, url, at, ... }] , ... }
 * targets: 이번 회차에 켜져 있는 감시 화면 [{ id, name, url }]
 * unread: Map(id → "limit" | "blocked" | "error") 이번에 못 읽은 화면과 사유
 */
export function mergeLastResult(prev, next, { targets = [], unread = new Map(), now = Date.now(), maxAgeMs = KEEP_MAX_AGE_MS } = {}) {
  const out = { ...next, table: [...(next.table || [])], rowTargetIds: [...(next.rowTargetIds || [])], places: { ...(next.places || {}) }, sggByWatch: { ...(next.sggByWatch || {}) }, perTarget: [...(next.perTarget || [])] };
  const usable =
    prev && Array.isArray(prev.table) && Array.isArray(prev.rowTargetIds) && prev.rowTargetIds.length === prev.table.length && Array.isArray(prev.perTarget) && Array.isArray(prev.columns);
  if (usable) {
    const watchCol = prev.columns.indexOf(WATCH_COL);
    const urlCol = prev.columns.indexOf(URL_COL);
    const readIds = new Set(out.perTarget.map((p) => p.id));
    for (const t of targets) {
      if (!t?.id || readIds.has(t.id) || !unread.has(t.id)) continue;
      const pp = prev.perTarget.find((p) => p.id === t.id);
      if (!pp || pp.url !== t.url) continue; // 지웠거나 주소가 바뀐 화면은 남기지 않음
      const at = Date.parse(pp.at);
      if (!Number.isFinite(at) || now - at > maxAgeMs) continue; // 7일 넘은 결과는 버림
      let rows = 0;
      prev.rowTargetIds.forEach((id, i) => {
        if (id !== t.id) return;
        const row = [...prev.table[i]];
        if (watchCol >= 0) row[watchCol] = t.name; // 이름을 바꿨으면 지금 이름으로
        out.table.push(row);
        out.rowTargetIds.push(t.id);
        rows++;
        const no = urlCol >= 0 ? articleNoOf(row[urlCol]) : null;
        if (no && prev.places?.[no] && !out.places[no]) out.places[no] = prev.places[no];
      });
      const sgg = prev.sggByWatch?.[pp.name];
      if (sgg && !out.sggByWatch[t.name]) out.sggByWatch[t.name] = sgg;
      out.perTarget.push({ ...pp, name: t.name, stale: true, reason: unread.get(t.id), rows });
    }
  }
  out.table = out.table.slice(0, MAX_TABLE_ROWS); // 이번 회차 줄이 앞에 있어 잘려도 새 결과가 남는다
  out.rowTargetIds = out.rowTargetIds.slice(0, MAX_TABLE_ROWS);
  out.partial = out.perTarget.some((p) => p.stale);
  return out;
}
