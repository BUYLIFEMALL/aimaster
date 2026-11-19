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
/** 줄별 감시 화면 id가 있는 새 모양 결과인가(옛 모양은 이름으로 추측하지 않는다) */
export function isIdResult(prev) {
  return !!prev && Array.isArray(prev.table) && Array.isArray(prev.rowTargetIds) && prev.rowTargetIds.length === prev.table.length && Array.isArray(prev.perTarget) && Array.isArray(prev.columns);
}

export function mergeLastResult(prev, next, { targets = [], unread = new Map(), now = Date.now(), maxAgeMs = KEEP_MAX_AGE_MS } = {}) {
  const out = { ...next, table: [...(next.table || [])], rowTargetIds: [...(next.rowTargetIds || [])], places: { ...(next.places || {}) }, sggByWatch: { ...(next.sggByWatch || {}) }, sggById: { ...(next.sggById || {}) }, perTarget: [...(next.perTarget || [])] };
  if (isIdResult(prev)) {
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
      // 행정동 경계는 id로 연결한다(같은 이름의 다른 지역 화면과 섞이지 않게). 옛 결과에 id 칸이 없을 때만 이름 값을 쓴다.
      const sgg = prev.sggById ? prev.sggById[t.id] : prev.sggByWatch?.[pp.name];
      if (sgg) out.sggById[t.id] = sgg;
      if (sgg && !out.sggByWatch[t.name]) out.sggByWatch[t.name] = sgg;
      out.perTarget.push({ ...pp, name: t.name, stale: true, reason: unread.get(t.id), rows });
    }
  }
  out.table = out.table.slice(0, MAX_TABLE_ROWS); // 이번 회차 줄이 앞에 있어 잘려도 새 결과가 남는다
  out.rowTargetIds = out.rowTargetIds.slice(0, MAX_TABLE_ROWS);
  out.partial = out.perTarget.some((p) => p.stale);
  return out;
}

/**
 * 한 곳도 읽지 않은 회차(상한 0곳·켜진 화면 0곳)의 결과 화면 정리 — 수집·알림·기록은 하지 않고 보존 규칙만 적용한다.
 * 켜진 화면이 0곳이면 남길 것이 없으니 빈 결과. 옛 모양 결과는 id가 없어 추릴 수 없으므로 지금처럼 그대로 둔다(켜진 화면 0곳일 때만 비움).
 */
export function pruneLastResult(prev, { at, targets = [], unread = new Map(), now = Date.now(), maxAgeMs = KEEP_MAX_AGE_MS } = {}) {
  if (!prev) return prev;
  const empty = { at, trigger: prev.trigger, result: prev.result, error: prev.error ?? null, columns: prev.columns, table: [], rowTargetIds: [], places: {}, sggByWatch: {}, sggById: {}, perTarget: [] };
  if (!targets.length) return { ...empty, partial: false };
  if (!isIdResult(prev)) return prev;
  return mergeLastResult(prev, empty, { targets, unread, now, maxAgeMs });
}
