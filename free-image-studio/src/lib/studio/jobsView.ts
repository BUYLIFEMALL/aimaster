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
      // 접수 번호가 같아도 작업 번호가 접수 기록과 다르면 그 줄의 상태·버튼을 쓰지 않는다(다른 범위의 목록이거나 어긋난 응답).
      if (s.jobId && job.id !== s.jobId) return { ...base, phase: "waiting" as const, jobId: s.jobId, error: "엔진 목록과 접수 기록의 작업 번호가 다릅니다. 잠시 뒤 다시 확인해 주세요.", actions: [] };
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

const STALE = "엔진 연결이나 작업 상태가 바뀌었습니다. 목록을 새로 읽은 뒤 다시 눌러 주세요.";

/**
 * 동작을 실행하기 **직전에** 다시 확인한다 — 화면에 보이던 줄은 예전 목록·예전 연결의 것일 수 있다.
 *  1) 이 접수가 지금 연결 범위의 것인가
 *  2) 지금 범위의 목록을 새로 읽어, 접수 번호와 작업 번호가 **둘 다** 접수 기록과 같은 작업이 있는가
 *  3) 그 작업의 상태가 이 동작을 할 수 있는 상태인가
 * 하나라도 아니면 아무것도 보내지 않고 「목록을 새로 읽어 주세요」로 돌려준다.
 */
async function currentJob(client: EngineClient, requestId: string, allowed: EngineJob["status"][]): Promise<{ sub: Submission; job: EngineJob }> {
  const sub = need(client, requestId);
  if (sub.state !== "accepted" || !sub.jobId || !client.inCurrentScope(requestId)) throw new EngineError("invalid", STALE);
  const jobs = await client.listJobs();
  if (!client.inCurrentScope(requestId)) throw new EngineError("invalid", STALE); // 목록을 읽는 사이 연결이 바뀜
  const now = need(client, requestId);
  const job = jobs.find((j) => j.clientRequestId === requestId && j.id === now.jobId);
  if (now.state !== "accepted" || !job || !allowed.includes(job.status)) throw new EngineError("invalid", STALE);
  return { sub: now, job };
}

/**
 * 사용자가 고른 동작. 새 접수 번호를 만드는 동작은 모두 사용자가 눌렀을 때만 일어나고, 실행 직전에 지금 범위·지금 목록으로 다시 확인한다.
 *  - again   완료된 그림을 시드만 바꿔 새로(원래 작업은 그대로)
 *  - restart 실패·중단·취소가 **지금 엔진 목록에서 확인된** 작업을 같은 내용으로 새로(원래 작업은 그대로 둔다 — 지우기는 따로)
 *  - replace 받았는지 모르는 접수를 새로 맡기고 옛 기록을 지운다. 엔진이 이미 그렸다면 같은 그림이 두 번 나온다(화면이 먼저 알린다)
 */
export async function again(client: EngineClient, requestId: string) {
  const { sub } = await currentJob(client, requestId, ["done"]);
  return client.submit(inputOf(sub, newSeed(sub.task.seed)));
}
export async function restart(client: EngineClient, requestId: string) {
  const { sub } = await currentJob(client, requestId, ["failed", "interrupted", "cancelled"]);
  return client.submit(inputOf(sub));
}
/** 한 줄 취소 — 지금 범위에서 대기·그리는 중으로 확인된 작업만 */
export async function cancelRow(client: EngineClient, requestId: string): Promise<void> {
  const { job } = await currentJob(client, requestId, ["queued", "running"]);
  await client.cancel(job.id);
}
/** 끝난 작업을 엔진 목록에서 지우기 — 지금 범위에서 끝난 것으로 확인된 작업만 */
export async function dismissRow(client: EngineClient, requestId: string): Promise<void> {
  const { job } = await currentJob(client, requestId, ["done", "failed", "interrupted", "cancelled"]);
  await client.dismiss(job.id);
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

/**
 * 「모두 멈추기」 — 엔진에 일시정지가 없어, 자기 범위의 대기·그리는 중 작업을 하나씩 취소한다. 접수 기록은 건드리지 않는다.
 * 화면이 갖고 있던 목록이 아니라 **지금 연결 범위의 목록을 새로 읽어** 취소한다.
 */
export async function cancelAll(client: EngineClient): Promise<{ cancelled: number; failed: number }> {
  const jobs = await client.listJobs();
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

/** 「다시 보내기」·새 접수 뒤 화면에 보일 문장. 받았는지 모르는 결과를 「접수되지 않았다」고 말하지 않는다 */
export function sendMessage(res: { state: "accepted" | "unknown" | "rejected"; error?: { message?: string } }, verb = "다시 보내"): string {
  if (res.state === "accepted") return `${verb} 접수됐습니다.`;
  if (res.state === "unknown") return "엔진이 받았는지 확인하지 못했습니다. 이미 받았을 수 있으니 「엔진에 확인」을 눌러 주세요.";
  return `접수되지 않았습니다${res.error?.message ? ` — ${res.error.message}` : ""}`;
}
