// U12 업무 비서(2026-11-10) — 맞춤 에이전트 백그라운드 실행 연결부. 플랜 docs/PLAN_20261110_U12_AGENT.md §3-2.
// · 백그라운드 실행(정시·페이지 변경·직접 실행·자동화 단계)은 반드시 「그 에이전트 주인 회원의 본인 AI 키」로 실행한다.
//   원본 대기열은 프로세스 하나에서 공유되어, 서버리스 동시 요청 때 다른 회원 요청 맥락(그 회원 키)에서 이어 실행될 수 있었다.
//   → 실행 하나하나를 주인 키로 감싼다(키가 없으면 빈 키 → 원본 「본인 키를 등록해 주세요」로 실패, 다른 키로 대신하지 않음).
// · 요청이 끝나면 서버리스 함수가 멈추므로, 명령 뒤(after)와 회원 정시 실행 주소에서 대기열이 빌 때까지 기다린다.
import 'server-only';
import { db, withoutRequestCache } from '@/litpage/server/db.ts';
import { getAgent } from '@/litpage/server/agents/model.ts';
import { drainRuns, recoverAgentRuns, setAgentRunWrapper } from '@/litpage/server/agents/runs.ts';
import { withMemberAiKeys } from '@/litpage/server/ai/providers/config.ts';
import { loadMemberAiKeys } from './memberAiKeys';

/** 한 번의 대기 시간 상한(Vercel 300초 안 — 앞뒤 작업 여유를 남김) */
export const AGENT_DRAIN_MS = 240_000;

/** 에이전트 주인 회원의 본인 AI 키로 fn 실행(지금 요청 맥락의 키는 쓰지 않음). 주인을 못 찾으면 빈 키 */
export async function runWithOwnerKeys<T>(agentId: string, fn: () => Promise<T>): Promise<T> {
  const owner = getAgent(agentId)?.owner_id ?? null;
  const keys = owner ? await loadMemberAiKeys(owner).catch(() => ({})) : {};
  return withMemberAiKeys(keys, () => withoutRequestCache(fn));
}

setAgentRunWrapper(runWithOwnerKeys);

/** 이 회원이 주인인 살아 있는 에이전트 id 목록 */
export function memberAgentIds(userId: string): string[] {
  const rows = db.prepare(`SELECT data FROM records WHERE tbl = 'workflow' AND alive = 1`).all() as { data: string }[];
  const ids: string[] = [];
  for (const r of rows) {
    try {
      const a = JSON.parse(r.data) as { id?: string; owner_id?: string | null };
      if (a.id && a.owner_id === userId) ids.push(a.id);
    } catch {
      /* 깨진 레코드는 건너뜀 */
    }
  }
  return ids;
}

/** 대기열이 빌 때까지 기다린다(시간을 넘기면 남은 일은 다음 정시 확인 때 이어서). 실패는 기록만. */
export async function settleAgentRuns(timeoutMs = AGENT_DRAIN_MS): Promise<void> {
  try {
    await drainRuns(timeoutMs);
  } catch (e) {
    console.error(`[agents] drain: ${String((e as Error)?.message ?? e).slice(0, 200)}`);
  }
}

/** 회원 정시 실행 주소: 이 회원 에이전트의 멈춘 실행 정리·남은 대기 실행 다시 넣기 → 끝날 때까지 기다림 */
export async function runMemberAgentWork(userId: string): Promise<number> {
  const ids = memberAgentIds(userId);
  const requeued = recoverAgentRuns(ids);
  await settleAgentRuns();
  return requeued;
}
