// 재생 대기열(섞기·반복) — 원본 boks-music `src/playback-queue.mjs`(MIT, © 2026 boksajang)를 옮김(2026-11-06).
// 섞어 듣기는 한 바퀴에 모든 곡을 한 번씩 듣고, 다음 바퀴 첫 곡이 방금 곡과 같지 않다. 「반복 끔」이면 끝에서 멈춘다.
// 순수 함수 — 시험 tests/playbackQueue.test.mjs.
import type { RepeatMode } from "./playerOrder";

export type PlaybackQueue = { ids: string[]; order: string[]; index: number; shuffle: boolean; repeat: RepeatMode };
type Random = () => number;

const unique = (ids: string[]) => [...new Set(ids.filter((id) => typeof id === "string" && id))];
function shuffled(ids: string[], random: Random) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createPlaybackQueue(ids: string[], { shuffle = false, repeat = "off" as RepeatMode, random = Math.random as Random } = {}): PlaybackQueue {
  const source = unique(ids);
  return { ids: source, order: shuffle ? shuffled(source, random) : [...source], index: 0, shuffle, repeat };
}

export const currentQueueId = (q: PlaybackQueue | null) => q?.order[q.index];

/** 다음(direction 1)·이전(-1). ended=true는 곡이 끝나서 넘어갈 때(한 곡 반복은 이때만 같은 곡). 멈춰야 하면 null */
export function stepPlaybackQueue(q: PlaybackQueue, { direction = 1, ended = false, random = Math.random as Random } = {}): PlaybackQueue | null {
  if (!currentQueueId(q)) return null;
  if (ended && q.repeat === "one") return { ...q };
  const index = q.index + (direction < 0 ? -1 : 1);
  if (index >= 0 && index < q.order.length) return { ...q, index };
  if (q.repeat !== "all") return null;
  if (direction < 0) return { ...q, index: q.order.length - 1 };
  const order = q.shuffle ? shuffled(q.ids, random) : [...q.ids];
  // 새 바퀴의 첫 곡이 방금 들은 곡이면 둘째와 바꾼다
  if (q.shuffle && order.length > 1 && order[0] === currentQueueId(q)) [order[0], order[1]] = [order[1], order[0]];
  return { ...q, order, index: 0 };
}

export function selectQueueTrack(q: PlaybackQueue, id: string): PlaybackQueue {
  const index = q.order.indexOf(id);
  return index < 0 ? q : { ...q, index };
}

/** 섞기를 켜면 지금 곡을 맨 앞에 두고 나머지를 섞고, 끄면 원래 순서에서 지금 곡 자리로 */
export function setQueueShuffle(q: PlaybackQueue, enabled: boolean, random: Random = Math.random): PlaybackQueue {
  if (q.shuffle === enabled) return q;
  const current = currentQueueId(q);
  const order = enabled ? [current, ...shuffled(q.ids.filter((id) => id !== current), random)].filter((x): x is string => !!x) : [...q.ids];
  return { ...q, shuffle: enabled, order, index: Math.max(0, current ? order.indexOf(current) : 0) };
}
