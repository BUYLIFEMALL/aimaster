// 진행 중 수집 작업 상태 확인(작업 목록·대시보드 공용) — 2026-11-17 T-07.
// 원래 JobsList.tsx 안에 있던 5초 확인 규칙을 그대로 옮기고 빈틈 세 가지를 막았다:
//   숨은 탭이면 그 회차 건너뜀 · 앞 요청이 안 끝났으면 그 회차 건너뜀 · 401·403·404면 영구 멈춤.
// React·fetch를 모르는 순수 코드다(시험은 tests/active-jobs-poller.test.cjs).
//
// 한 번 만든 poller는 한 "세대"다. ID 세트가 바뀌거나 화면이 사라지면 호출하는 쪽이 stop()하고
// 새 poller를 만든다 — stop() 뒤에 도착한 이전 세대의 응답은 버린다(refresh 0).

export const POLL_INTERVAL_MS = 5_000;
/** 한 회차(그 회차의 모든 요청)를 기다리는 최대 시간. 넘으면 그 회차 요청을 취소하고 다음 정상 회차로(QA029 P2). */
export const ROUND_TIMEOUT_MS = 10_000;
export const ACTIVE_JOB_STATUSES = ["pending", "running"] as const;

export type JobStatusResult =
  | { kind: "ok"; status: string } // 200 — status 값을 보고 판단
  | { kind: "stop" } // 401·403·404 — 로그아웃·계정 전환·남의 작업: 더 묻지 않는다
  | { kind: "error" }; // 네트워크 오류·5xx 등 일시 실패 — 다음 회차에 다시(즉시 재시도 없음)

export type StopReason = "transitioned" | "unauthorized" | "stopped";

export type ActiveJobsPollerOptions = {
  ids: readonly string[];
  fetchStatus: (id: string, signal: AbortSignal) => Promise<JobStatusResult>;
  /** 진행 중이던 작업 중 하나라도 끝난 것을 처음 발견했을 때 한 번만 부른다. */
  onTransition: () => void;
  onStop?: (reason: StopReason) => void;
  /** false면 그 회차는 요청하지 않는다(숨은 탭). */
  isVisible: () => boolean;
  intervalMs?: number;
};

export function isActiveJobStatus(status: string): boolean {
  return (ACTIVE_JOB_STATUSES as readonly string[]).includes(status);
}

export function createActiveJobsPoller(opts: ActiveJobsPollerOptions) {
  const ids = [...opts.ids];
  const intervalMs = opts.intervalMs ?? POLL_INTERVAL_MS;
  const controller = new AbortController();
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  let inFlight = false;

  function finish(reason: StopReason) {
    if (stopped) return;
    stopped = true;
    if (timer !== null) clearInterval(timer);
    timer = null;
    controller.abort();
    opts.onStop?.(reason);
  }

  async function round() {
    if (stopped || inFlight || !opts.isVisible()) return;
    inFlight = true;
    // 회차마다 따로 취소 신호를 둔다: 세대가 끝나면(stop·거절) 같이 끝나고, 회차 상한에 걸려도 끝난다.
    const roundController = new AbortController();
    const onGenerationAbort = () => roundController.abort();
    controller.signal.addEventListener("abort", onGenerationAbort, { once: true });
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const roundEnded = new Promise<"ended">((resolve) => {
      roundController.signal.addEventListener("abort", () => resolve("ended"), { once: true });
    });
    timeoutId = setTimeout(() => roundController.abort(), ROUND_TIMEOUT_MS);

    let outcome: JobStatusResult[] | "ended";
    try {
      const each = ids.map((id) =>
        opts
          .fetchStatus(id, roundController.signal)
          .catch((): JobStatusResult => ({ kind: "error" }))
          .then((result) => {
            // 거절(401·403·404)은 다른 요청을 기다리지 않고 도착 즉시 멈춘다 → 남은 요청도 취소된다.
            if (result.kind === "stop" && !roundController.signal.aborted) finish("unauthorized");
            return result;
          })
      );
      outcome = await Promise.race([Promise.all(each), roundEnded]);
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
      roundController.abort(); // 아직 남은 요청이 있으면 취소(이미 끝났으면 영향 없음)
      controller.signal.removeEventListener("abort", onGenerationAbort);
      inFlight = false;
    }
    if (stopped) return; // 이 세대가 끝난 뒤 도착한 응답은 버린다
    if (outcome === "ended") return; // 회차 상한 — 권한 거절과 달리 멈추지 않고 다음 정상 회차(즉시 재시도 없음)
    const results = outcome;
    if (results.some((r) => r.kind === "stop")) {
      finish("unauthorized");
      return;
    }
    if (results.some((r) => r.kind === "ok" && !isActiveJobStatus(r.status))) {
      finish("transitioned");
      opts.onTransition();
    }
    // 그 밖(모두 진행 중·일시 실패)은 다음 회차를 기다린다.
  }

  return {
    start() {
      if (stopped || timer !== null || ids.length === 0) return;
      timer = setInterval(() => {
        void round();
      }, intervalMs);
    },
    stop() {
      finish("stopped");
    },
  };
}
