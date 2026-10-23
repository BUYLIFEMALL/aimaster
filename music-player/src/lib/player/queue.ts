import type { RepeatMode, SortDir, SortKey, TrackMeta } from "./types";

export interface QueueState {
  currentId: string | null;
  shuffle: boolean;
  repeat: RepeatMode;
  /** 셔플 한 바퀴 동안 이미 재생한 곡 id(중복 재생 방지) */
  played: string[];
}

export interface NextResult { id: string | null; played: string[] }

/**
 * 다음 곡 계산. order는 화면에 보이는 순서(검색·정렬 반영)의 곡 id 목록이다.
 * manual=true(사용자가 다음 버튼을 누름)이면 목록 끝에서 처음으로 돌아가고,
 * manual=false(곡이 끝나 자동 이동)이면 반복 설정을 따른다(없음이면 끝에서 멈춤).
 */
export function nextOf(order: string[], st: QueueState, manual: boolean, rand: () => number = Math.random): NextResult {
  if (order.length === 0) return { id: null, played: [] };
  const idx = st.currentId ? order.indexOf(st.currentId) : -1;

  if (st.shuffle) {
    let played = st.played.filter((id) => order.includes(id));
    if (st.currentId && !played.includes(st.currentId)) played = [...played, st.currentId];
    let pool = order.filter((id) => !played.includes(id));
    if (pool.length === 0) {
      if (!manual && st.repeat !== "all") return { id: null, played };
      // 새 바퀴: 방금 들은 곡만 빼고 다시 섞는다
      played = st.currentId ? [st.currentId] : [];
      pool = order.filter((id) => id !== st.currentId);
      if (pool.length === 0) pool = [...order];
    }
    const pick = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
    return { id: pick, played };
  }

  const nextIdx = idx + 1;
  if (nextIdx < order.length) return { id: order[nextIdx], played: st.played };
  if (manual || st.repeat === "all") return { id: order[0], played: [] };
  return { id: null, played: st.played };
}

export interface PrevResult { id: string | null; restart: boolean; played: string[] }

/** 이전 곡: 3초 넘게 들었으면 현재 곡을 처음부터, 아니면 이전 곡(셔플이면 직전에 들은 곡) */
export function prevOf(order: string[], st: QueueState, currentTime: number): PrevResult {
  if (order.length === 0) return { id: null, restart: false, played: [] };
  if (st.currentId && currentTime > 3) return { id: st.currentId, restart: true, played: st.played };
  if (st.shuffle) {
    const hist = st.played.filter((id) => order.includes(id) && id !== st.currentId);
    if (hist.length > 0) {
      const id = hist[hist.length - 1];
      return { id, restart: false, played: st.played.filter((x) => x !== id && x !== st.currentId) };
    }
  }
  const idx = st.currentId ? order.indexOf(st.currentId) : 0;
  const prevIdx = idx <= 0 ? order.length - 1 : idx - 1;
  return { id: order[prevIdx], restart: false, played: st.played };
}

// ---- 검색·정렬 ----

export function filterSort(tracks: TrackMeta[], term: string, key: SortKey, dir: SortDir): TrackMeta[] {
  const q = term.trim().toLowerCase();
  const filtered = q
    ? tracks.filter((t) => t.name.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q))
    : tracks.slice();
  const sign = dir === "asc" ? 1 : -1;
  return filtered.sort((a, b) => {
    let r: number;
    if (key === "duration") r = a.duration - b.duration;
    else if (key === "added") r = a.addedAt - b.addedAt;
    else r = (a[key] || "").localeCompare(b[key] || "", "ko");
    if (r === 0) r = a.addedAt - b.addedAt;
    return r * sign;
  });
}

const SORT_CYCLE: { key: SortKey; dir: SortDir }[] = [
  { key: "added", dir: "asc" },
  { key: "name", dir: "asc" },
  { key: "name", dir: "desc" },
  { key: "artist", dir: "asc" },
  { key: "artist", dir: "desc" },
  { key: "duration", dir: "asc" },
  { key: "duration", dir: "desc" },
];

export function nextSort(key: SortKey, dir: SortDir): { key: SortKey; dir: SortDir } {
  const i = SORT_CYCLE.findIndex((s) => s.key === key && s.dir === dir);
  return SORT_CYCLE[(i + 1) % SORT_CYCLE.length];
}

export const SORT_LABEL: Record<SortKey, string> = { added: "추가한 순서", name: "제목", artist: "아티스트", duration: "길이" };
