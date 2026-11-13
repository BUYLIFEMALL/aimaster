// 메이커 P1(2026-11-13) 상품 합성 일괄 실행 — 한 개씩 순서대로, 중단하면 지금 하던 한 개를 마친 뒤 멈춘다(시험 대상, DOM 없음).
// 이미 끝난(done) 항목은 다시 하지 않는다 → 「실패한 것만 다시」는 같은 함수를 다시 부르면 된다.

export type QueueState = "ready" | "running" | "done" | "failed" | "skipped" | "invalid";
export interface QueueItem { key: string; status: QueueState }
export interface QueueUpdate { key: string; status: QueueState; error?: string }

export async function runQueue<T extends QueueItem>(
  items: T[],
  work: (item: T) => Promise<void>,
  opts: { signal?: AbortSignal; onUpdate?: (u: QueueUpdate) => void; retryFailed?: boolean } = {},
): Promise<{ done: number; failed: number; stopped: boolean }> {
  let done = 0, failed = 0;
  const targets = items.filter((it) => it.status === "ready" || it.status === "skipped" || (opts.retryFailed && it.status === "failed"));
  for (const it of targets) {
    if (opts.signal?.aborted) return { done, failed, stopped: true };
    opts.onUpdate?.({ key: it.key, status: "running" });
    try {
      await work(it);
      done++;
      opts.onUpdate?.({ key: it.key, status: "done" });
    } catch (e) {
      failed++;
      opts.onUpdate?.({ key: it.key, status: "failed", error: e instanceof Error ? e.message : "알 수 없는 오류" });
    }
  }
  return { done, failed, stopped: false };
}
