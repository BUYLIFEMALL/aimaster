// U11 자동화(2026-11-10) — 회원 정시 작업(반복 자동화·반복 템플릿·리마인더)을 회원 본인 cron-job.org가 돌리게 하는 연결부.
// 플랜 docs/PLAN_20261110_U11_AUTOMATION.md §3-3, 지침 루트 docs/SCHEDULER_POLICY.md.
// · 원본 예약 장치(scheduler.ts)의 작업 표 `scheduled_jobs`에는 「누구 작업」 칸이 없다 → 작업 종류별로 주인을 찾는다.
//   반복 자동화·반복 템플릿 = 자동화 레코드의 created_by_id(= Supabase 회원 id), 리마인더 = payload.ownerId.
// · 운영자 하루 1번 정리 작업(/api/cron/jobs)은 회원 작업을 처리하지 않는다(주인님 결정 1번). 회원 실행 주소(/api/cron/member)가 그 회원 것만 처리.
// · 명령 하나가 처리되는 동안 회원 작업이 예약되면 표시해 두고, 명령이 끝난 뒤 그 회원의 cron-job.org 작업이 꺼져 있을 때만 켠다
//   (cron-job.org 하루 호출 한도 100회를 아끼려고 — 켜져 있으면 부르지 않음).
import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getRecord } from '@/litpage/server/db.ts';
import { listJobs, onJobScheduled, type Job } from '@/litpage/server/scheduler.ts';
import type { AutomationRecord } from '#shared/automation/types.ts';
import type { AgentRecord } from '#shared/agents.ts';

/** U12: 에이전트 예약 작업 키 앞글자(원본 agents/triggers.ts jobKey = `agent-recur:<에이전트>:<트리거>`) */
const AGENT_JOB_PREFIX = 'agent-recur:';

/** 회원 정시 작업 종류(작업 키 앞글자). U12(2026-11-10)에서 에이전트 예약(agent-recurrence)을 더함 */
export const MEMBER_JOB_KINDS: Record<string, string> = {
  'automation.recurrence': 'automation:',
  reminder: 'reminder:',
  'agent-recurrence': AGENT_JOB_PREFIX,
};

export function isMemberJob(job: Pick<Job, 'kind'>): boolean {
  return Object.hasOwn(MEMBER_JOB_KINDS, job.kind);
}

/** 작업의 주인(회원 id). 찾지 못하면 null — 그 작업은 어느 회원 실행에서도 돌지 않는다. */
export function jobOwner(job: Pick<Job, 'kind' | 'payload'>): string | null {
  const p = (job.payload ?? {}) as Record<string, unknown>;
  if (job.kind === 'reminder') return typeof p.ownerId === 'string' ? p.ownerId : null;
  if (job.kind === 'automation.recurrence') {
    const a = getRecord<AutomationRecord>('automation', String(p.id ?? ''));
    return a && a.alive !== false ? (a.created_by_id ?? null) : null;
  }
  if (job.kind === 'agent-recurrence') {
    // U12: 에이전트의 주인(owner_id = Supabase 회원 id) — 그 회원의 정시 실행에서만, 그 회원 키로 돈다
    const a = getRecord<AgentRecord>('workflow', String(p.agentId ?? ''));
    return a && a.alive !== false ? (a.owner_id ?? null) : null;
  }
  return null;
}

/** 회원 실행 주소용: 이 회원의 작업만 */
export function memberJobFilter(userId: string): (job: Job) => boolean {
  return (job) => isMemberJob(job) && jobOwner(job) === userId;
}

/** 운영 정리 작업용: 회원 작업은 건너뜀 */
export const operatorJobFilter = (job: Job) => !isMemberJob(job);

/** 이 회원의 남은 정시 작업 수(0이면 회원 cron-job.org 작업을 끈다) */
export function countMemberJobs(userId: string): number {
  let n = 0;
  for (const [kind, prefix] of Object.entries(MEMBER_JOB_KINDS)) {
    for (const job of listJobs(prefix, 5000)) if (job.kind === kind && jobOwner(job) === userId) n++;
  }
  return n;
}

// ---------------------------------------------------------------- 명령 처리 중 「회원 작업이 예약됐는가」 표시
const tracking = new AsyncLocalStorage<{ scheduled: boolean }>();

let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  onJobScheduled((kind) => {
    const store = tracking.getStore();
    if (store && Object.hasOwn(MEMBER_JOB_KINDS, kind)) store.scheduled = true;
  });
}

/** fn을 실행하면서 그동안 회원 정시 작업이 예약됐는지 함께 돌려준다 */
export async function trackMemberJobs<T>(fn: () => Promise<T>): Promise<{ result: T; scheduled: boolean }> {
  listen();
  const store = { scheduled: false };
  const result = await tracking.run(store, fn);
  return { result, scheduled: store.scheduled };
}

/** Supabase 서비스 클라이언트 타입 맞춤(공용 사본이 SupabaseClient를 받음) */
export type Service = SupabaseClient;
