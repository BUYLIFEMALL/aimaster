// v1.23 장면 영상 일괄 생성의 전체 진행률·남은 시간 — 화면·node 시험이 함께 쓰는 순수 함수(가져오기 없음).
// 남은 시간 = 끝난 장면들의 평균 걸린 시간(없으면 기본 2분)으로, 동시에 만드는 자리마다 남은 장면을 차례로 넣어 가장 늦게 끝나는 자리의 시각.

export type BatchSceneState = "waiting" | "running" | "done" | "failed";

export interface BatchSummary {
  total: number;
  done: number;
  failed: number;
  running: number;
  waiting: number;
  /** 끝난(성공+실패) 비율 0~100 */
  percent: number;
  /** 남은 예상 초(모두 끝났으면 0) */
  etaSec: number;
  /** 끝난 장면 평균이 아니라 기본값으로 계산했는지 */
  estimated: boolean;
}

export const DEFAULT_SCENE_SEC = 120;

export function summarizeBatch(input: {
  states: BatchSceneState[];
  /** 끝난 장면마다 걸린 초 */
  finishedSec: number[];
  /** 지금 만드는 장면마다 지난 초 */
  runningSec: number[];
  concurrency: number;
  defaultSec?: number;
}): BatchSummary {
  const count = (s: BatchSceneState) => input.states.filter((x) => x === s).length;
  const total = input.states.length;
  const done = count("done"), failed = count("failed"), running = count("running"), waiting = count("waiting");
  const percent = total ? Math.round(((done + failed) / total) * 100) : 0;
  const good = input.finishedSec.filter((n) => Number.isFinite(n) && n > 0);
  const estimated = good.length === 0;
  const avg = estimated ? (input.defaultSec ?? DEFAULT_SCENE_SEC) : good.reduce((a, b) => a + b, 0) / good.length;
  const conc = Math.max(1, Math.floor(input.concurrency) || 1);
  const remaining = running + waiting;
  if (remaining === 0) return { total, done, failed, running, waiting, percent, etaSec: 0, estimated };
  // 자리(동시에 만드는 개수)마다 비는 시각을 두고, 기다리는 장면을 가장 먼저 비는 자리에 차례로 넣는다.
  // 지금 만드는 장면은 평균에서 지난 시간만큼 덜 남음(평균을 넘겼으면 곧 끝난다고 봄)
  const slots = input.runningSec.slice(0, conc).map((s) => Math.max(0, avg - Math.max(0, s)));
  while (slots.length < conc) slots.push(0);
  for (let i = 0; i < waiting; i++) {
    const k = slots.indexOf(Math.min(...slots));
    slots[k] += avg;
  }
  const etaSec = Math.round(Math.max(...slots));
  return { total, done, failed, running, waiting, percent, etaSec, estimated };
}

/** 초 → 「3분 05초」「45초」 */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m ? `${m}분 ${String(s % 60).padStart(2, "0")}초` : `${s}초`;
}
