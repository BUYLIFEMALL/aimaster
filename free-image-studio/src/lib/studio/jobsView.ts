// 작업 기록 화면에 보일 줄을 만든다 — 브라우저의 접수 기록과 엔진의 작업 목록을 합친다. 화면과 분리한 판단 로직.
import { EngineError, SEED_MAX, type EngineClient, type EngineJob, type Submission } from "../engine.ts";

export type Phase =
  | "sending" // 보내는 중(또는 보내다 화면이 닫힘)
  | "unknown" // 엔진이 받았는지 모름
  | "rejected" // 엔진이 받지 않음
  | "waiting" // 접수됨 — 엔진 목록을 아직 못 읽음
  | "queued"
  | "running"
  | "done"
  | "failed"
  | "cancelled"
  | "interrupted"
  | "gone"; // 접수됐지만 엔진 목록에 없음(지웠거나 정리됨)

export type Action =
  | "confirm" // 엔진에 같은 접수 번호를 물어보기
  | "replace" // 새로 맡기기(엔진이 이미 그렸다면 같은 그림이 두 번 나올 수 있음 — 화면이 알린 뒤)
  | "resend" // 같은 접수 번호로 다시 보내기(넣기 전 거절이 확실한 접수)
  | "discard" // 기록에서 지우기
  | "cancel" // 그리기 취소
  | "save" // 그림 저장
  | "again" // 다시 만들기(시드만 바꿔 새로)
  | "restart" // 실패·중단·취소된 것을 같은 내용으로 다시
  | "dismiss"; // 엔진 목록과 기록에서 지우기

export type Row = {
  requestId: string;
  title: string;
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
  at: number;
  phase: Phase;
  inScope: boolean;
  jobId?: string;
  stage?: string;
  error?: string;
  result?: EngineJob["result"];
  actions: Action[];
};

export const PHASE_LABEL: Record<Phase, string> = {
  sending: "보내는 중",
  unknown: "확인 필요",
  rejected: "접수 안 됨",
  waiting: "접수됨",
  queued: "대기 중",
  running: "그리는 중",
  done: "완료",
  failed: "실패",
  cancelled: "취소됨",
  interrupted: "중단됨",
  gone: "엔진 목록에 없음",
};

/**
 * jobs가 null이면 엔진 목록을 못 읽은 상태다(꺼짐·연결 필요 등) — 접수된 줄은 「접수됨」으로만 보이고 동작 버튼을 주지 않는다.
 * 자동으로 하는 동작은 없다. 모든 동작은 사용자가 고른다.
 */
export function buildRows(subs: Submission[], jobs: EngineJob[] | null, ctx: { inScope: (requestId: string) => boolean; canResend: (requestId: string) => boolean; busy?: (requestId: string) => boolean }): Row[] {
  const byRequest = new Map((jobs ?? []).map((j) => [j.clientRequestId, j]));
  return [...subs]
    .sort((a, b) => b.at - a.at)
    .map((s) => {
      const inScope = ctx.inScope(s.requestId);
      const base = { requestId: s.requestId, title: s.title, prompt: s.task.prompt, width: s.task.width, height: s.task.height, seed: s.task.seed, at: s.at, inScope };
      if (ctx.busy?.(s.requestId)) return { ...base, phase: "sending" as const, actions: [] };
      if (s.state === "pending" || s.state === "unknown") {
        // 범위가 바뀐 과거 접수는 엔진에 물어볼 수 없다. 새로 맡길지 지울지만 고른다.
        return { ...base, phase: s.state === "pending" ? ("sending" as const) : ("unknown" as const), error: s.error, actions: (inScope ? ["confirm", "replace", "discard"] : ["replace", "discard"]) as Action[] };
      }
      if (s.state === "rejected") return { ...base, phase: "rejected" as const, error: s.error, actions: (ctx.canResend(s.requestId) ? ["resend", "discard"] : ["discard"]) as Action[] };
      // accepted
      if (!inScope) return { ...base, phase: "gone" as const, jobId: s.jobId, error: "엔진 연결이 바뀌어 이 작업은 더 볼 수 없습니다. 엔진 창에서 확인해 주세요.", actions: ["discard"] as Action[] };
      if (!jobs) return { ...base, phase: "waiting" as const, jobId: s.jobId, actions: [] };
      const job = byRequest.get(s.requestId);
      if (!job) return { ...base, phase: "gone" as const, jobId: s.jobId, actions: ["discard"] as Action[] };
      const common = { ...base, jobId: job.id, stage: job.stage, error: job.error, result: job.result };
      if (job.status === "queued" || job.status === "running") return { ...common, phase: job.status, actions: ["cancel"] as Action[] };
      if (job.status === "done") return { ...common, phase: "done" as const, actions: ["save", "again", "dismiss"] as Action[] };
      return { ...common, phase: job.status, actions: ["restart", "dismiss"] as Action[] };
    });
}

/** 진행 요약 — 화면 위쪽 진행 막대용 */
export function summarize(rows: Row[]) {
  const count = (...p: Phase[]) => rows.filter((r) => p.includes(r.phase)).length;
  return { total: rows.length, done: count("done"), active: count("queued", "running", "sending", "waiting"), failed: count("failed", "interrupted", "cancelled", "rejected"), needCheck: count("unknown", "gone") };
}

const newSeed = (not?: number): number => {
  const a = new Uint32Array(1);
  let s: number;
  do {
    globalThis.crypto.getRandomValues(a);
    s = a[0] & SEED_MAX;
  } while (s === not);
  return s;
};
const inputOf = (s: Submission, seed = s.task.seed) => ({ title: s.title, prompt: s.task.prompt, ...(s.task.variantId !== undefined ? { variantId: s.task.variantId } : {}), ...(s.task.width !== undefined ? { width: s.task.width, height: s.task.height } : {}), ...(seed !== undefined ? { seed } : {}) });
const need = (client: EngineClient, requestId: string): Submission => {
  const s = client.submissions().find((x) => x.requestId === requestId);
  if (!s) throw new EngineError("invalid", "접수 기록이 없습니다.");
  return s;
};

/**
 * 사용자가 고른 동작. 모두 새 접수 번호를 만드는 동작은 사용자가 눌렀을 때만 일어난다.
 *  - again   완료된 그림을 시드만 바꿔 새로(원래 작업은 그대로)
 *  - restart 실패·중단·취소가 **엔진 목록에서 확인된** 작업을 같은 내용으로 새로(원래 작업은 그대로 둔다 — 지우기는 따로)
 *  - replace 받았는지 모르는 접수를 새로 맡기고 옛 기록을 지운다. 엔진이 이미 그렸다면 같은 그림이 두 번 나온다(화면이 먼저 알린다)
 */
export async function again(client: EngineClient, requestId: string) {
  const s = need(client, requestId);
  return client.submit(inputOf(s, newSeed(s.task.seed)));
}
export async function restart(client: EngineClient, requestId: string, jobs: EngineJob[]) {
  const s = need(client, requestId);
  const job = jobs.find((j) => j.clientRequestId === requestId);
  if (s.state !== "accepted" || !job || !["failed", "interrupted", "cancelled"].includes(job.status)) throw new EngineError("invalid", "실패·중단·취소가 확인된 작업만 다시 시작할 수 있습니다.");
  return client.submit(inputOf(s));
}
export async function replace(client: EngineClient, requestId: string, acknowledged: boolean) {
  const s = need(client, requestId);
  if (!acknowledged) throw new EngineError("invalid", "같은 그림이 두 번 나올 수 있음을 확인해 주세요.");
  if (s.state !== "unknown" && s.state !== "pending") throw new EngineError("invalid", "받았는지 모르는 접수만 새로 맡길 수 있습니다.");
  const res = await client.submit(inputOf(s));
  // 새 접수 기록이 생긴 뒤에만 옛 기록을 지운다(새로 맡기기가 기록도 못 남기고 실패하면 옛 기록을 잃지 않는다).
  client.forget(requestId, { force: true });
  return res;
}

/** 「모두 멈추기」 — 엔진에 일시정지가 없어, 자기 범위의 대기·그리는 중 작업을 하나씩 취소한다. 접수 기록은 건드리지 않는다 */
export async function cancelAll(client: EngineClient, jobs: EngineJob[]): Promise<{ cancelled: number; failed: number }> {
  let cancelled = 0;
  let failed = 0;
  for (const job of jobs) {
    if (job.status !== "queued" && job.status !== "running") continue;
    try {
      await client.cancel(job.id);
      cancelled += 1;
    } catch (e) {
      if (e instanceof EngineError && e.kind === "stale") throw e;
      failed += 1;
    }
  }
  return { cancelled, failed };
}
