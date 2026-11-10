// U11 자동화(2026-11-10) — 명령이 끝난 뒤(after) 할 일과 회원 정시 실행 켜기. 플랜 docs/PLAN_20261110_U11_AUTOMATION.md §3-2·3-3.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerState } from '@/lib/schedulerMember/memberScheduler';
import { settleAutomations } from '@/litpage/server/automations/engine.ts';
import { withRequestCache } from '@/litpage/server/db.ts';
import { settleAgentRuns } from './agentRuns';

function service(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/**
 * 회원 정시 작업이 새로 예약된 뒤: 회원 cron-job.org 작업이 「대기(꺼짐)」일 때만 켠다.
 * 이미 실행 중·일시정지·키 없음이면 cron-job.org를 부르지 않는다(하루 호출 한도 100회 절약).
 */
export async function ensureMemberSchedulerAfterSchedule(userId: string): Promise<void> {
  const svc = service();
  const state = await memberSchedulerState(svc, userId);
  if (state.state !== 'idle' || state.scheduled === 0) return;
  const key = await memberCronjobKey(svc, userId);
  if (!key) return;
  await ensureMemberSchedulerRunning(svc, userId, key);
}

/** 명령 응답 뒤(after): 값 변경 자동화를 끝까지 실행하고, 회원 정시 작업이 예약됐으면 회원 실행을 켠다. 실패는 기록만. */
export async function afterRpc(userId: string, scheduledMemberJob: boolean): Promise<void> {
  try {
    await withRequestCache(() => settleAutomations());
  } catch (e) {
    console.error(`[automation] settle failed: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
  }
  // U12: 이 명령이 넣은 에이전트 실행(직접 실행·페이지 변경·자동화 단계)이 끝날 때까지 기다린다(실행마다 주인 키로)
  await settleAgentRuns();
  if (!scheduledMemberJob) return;
  try {
    await withRequestCache(() => ensureMemberSchedulerAfterSchedule(userId));
  } catch (e) {
    console.error(`[member-scheduler] ensure failed user=${userId}: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
  }
}
