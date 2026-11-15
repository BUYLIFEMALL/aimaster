// 이 계정에 연결된 확장이 지금 일하고 있는지 — 확장은 30초마다 서버에 접속하며 `last_seen_at`을 남긴다.
// 다른 계정에 연결됐거나 꺼져 있으면 「지금 점검」·보내기가 말없이 「대기」로 남으므로(2026-11-06 실측) 화면에서 미리 알린다.

export const PRESENCE_WINDOW_MS = 3 * 60_000;

export type Presence = "none" | "stale" | "recent";

/** 연결 기록들의 마지막 접속 시각으로 상태를 정한다. none = 이 계정과 연결된 확장 없음, stale = 최근 3분 접속 없음 */
export function presenceOf(lastSeen: (string | null)[], now = Date.now()): { state: Presence; lastSeen: string | null } {
  const times = lastSeen.map((v) => (v ? Date.parse(v) : NaN)).filter((t) => Number.isFinite(t));
  if (!lastSeen.length) return { state: "none", lastSeen: null };
  if (!times.length) return { state: "stale", lastSeen: null };
  const latest = Math.max(...times);
  return { state: now - latest <= PRESENCE_WINDOW_MS ? "recent" : "stale", lastSeen: new Date(latest).toISOString() };
}
