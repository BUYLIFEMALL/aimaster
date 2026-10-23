import { createHash, randomUUID } from "node:crypto";
import type { ExecutionStatus } from "./executionStatus";

export const LEASE_MS = 180_000;
export const RUN_PATH = "research_summary->naver_execution->>runId";
export const OWNER_PATH = "research_summary->naver_execution->>owner";
export interface ExecutionRun extends Omit<ExecutionStatus, "expired"> { owner: string; endedAt?: string }
const object = (value: any): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value : {};
export const connectionOwner = (token: string) => createHash("sha256").update(token).digest("hex");
export const nextTimestamp = (previous: unknown, now = Date.now()) => {
  const at=Date.parse(String(previous));
  return new Date(Math.max(now,Number.isFinite(at)?at+1:now)).toISOString();
};
export function readExecution(summary: unknown): ExecutionRun | null {
  const run = object(object(summary).naver_execution);
  return typeof run.runId === "string" && typeof run.owner === "string" && typeof run.leaseExpiresAt === "string" ? run as ExecutionRun : null;
}
export const leaseExpired = (run: ExecutionRun, now = Date.now()) => !Number.isFinite(Date.parse(run.leaseExpiresAt)) || Date.parse(run.leaseExpiresAt) <= now;
export function newExecution(token: string, now = Date.now()): ExecutionRun {
  const at = new Date(now).toISOString();
  return { runId: randomUUID(), owner: connectionOwner(token), stage: "claimed", message: "원고 수신 확인 대기",
    done: 0, total: 0, startedAt: at, updatedAt: at, leaseExpiresAt: new Date(now + LEASE_MS).toISOString() };
}
export const withExecution = (summary: unknown, run: ExecutionRun) => ({ ...object(summary), naver_execution: run });
export function publicExecution(summary: unknown, now = Date.now()): ExecutionStatus | null {
  const run = readExecution(summary);
  if (!run) return null;
  return {runId:run.runId,stage:run.stage,message:run.message,done:run.done,total:run.total,
    startedAt:run.startedAt,updatedAt:run.updatedAt,leaseExpiresAt:run.leaseExpiresAt,expired:leaseExpired(run,now)};
}
export function publicPost(row: any) {
  if (!readExecution(row?.research_summary)) return row;
  const summary = { ...object(row.research_summary), naver_execution: publicExecution(row.research_summary) };
  return { ...row, research_summary: summary, execution: publicExecution(row.research_summary) };
}
// Fencing survives expiry: the actual final result may still be reported by the
// same run, but an old run/another PC may never overwrite a newer execution.
export function ownsExecution(run: ExecutionRun | null, bodyRunId: unknown, token: string): boolean {
  return run ? bodyRunId === run.runId && run.owner === connectionOwner(token) : bodyRunId == null;
}
export function advanceExecution(run: ExecutionRun, body: any, now = Date.now()): ExecutionRun {
  const next = { ...run, updatedAt: nextTimestamp(run.updatedAt,now), leaseExpiresAt: new Date(now + LEASE_MS).toISOString() };
  const stages = ["claimed", "waiting_login", "writing", "final_publish"];
  if (body.action === "stage") {
    if (!stages.includes(body.stage) || stages.indexOf(body.stage) < stages.indexOf(run.stage)) throw new Error("진행 단계가 올바르지 않습니다.");
    next.stage = body.stage;
  }
  if (body.action === "waiting" && ["claimed", "waiting_login"].includes(run.stage)) next.stage = "waiting_login";
  if (["progress", "waiting"].includes(body.action)) {
    const message = body.message ?? body.reason;
    if (typeof message !== "string" || message.length > 500) throw new Error("진행 안내 형식이 올바르지 않습니다.");
    next.message = message;
  }
  if (body.action === "progress" && body.done !== undefined) {
    if (!Number.isInteger(body.done) || !Number.isInteger(body.total) || body.done < 0 || body.total < 1 || body.done > body.total || body.total > 10_000 || body.done < run.done || (run.total && body.total !== run.total)) throw new Error("진행 횟수 형식이 올바르지 않습니다.");
    next.done = body.done; next.total = body.total;
  }
  return next;
}
