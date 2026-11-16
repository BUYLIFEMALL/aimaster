// PLAN-20261117-01 E1 보완(2026-11-17, Master msg_54873d545291) — 막힌 멘션 재시도 표시를 조건부 저장(CAS)으로.
// 로컬 Docker Postgres(aww-pg-test)만 쓴다. 실제 모델·발송 없음(실행 대기열에 넣는 대신 기록만 만듦).
// 재현: 재시도가 막힌 실행의 payload를 읽은 뒤 → 다른 worker가 재시도·자식 선점(루트에 notifyMeSent) → 처음 재시도가 낡은 payload로 덮어씀
//       → 표시가 사라지고 자식이 하나 더 생겨 같은 계보에서 두 번 보낼 수 있었다.
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

const AGENT = {
  id: 'a-ret', space_id: 's1', bot_id: 'bot-r', alive: true, published: true, status: 'active',
  data: { name: '재시도 시험', triggers: [{ id: 't-m', type: 'lit.agent_mentioned', enabled: true }] },
};
// 다른 worker가 끼어드는 지점: 재시도가 막힌 실행을 읽은 직후 한 번 실행
const gate = vi.hoisted(() => ({ hook: null as null | (() => void) }));

vi.mock('../../src/litpage/server/agents/model.ts', async (orig) => {
  const m = await orig<typeof import('../../src/litpage/server/agents/model.ts')>();
  return { ...m, getAgent: (id: string) => (id === 'a-ret' ? (AGENT as never) : m.getAgent(id)) };
});
vi.mock('../../src/litpage/server/agents/access.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/litpage/server/agents/access.ts')>()),
  agentBlockRole: () => 'editor',
}));
vi.mock('../../src/litpage/server/records.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/litpage/server/records.ts')>()),
  blockRole: () => 'editor',
}));
vi.mock('../../src/litpage/server/agents/runs.ts', async (orig) => {
  const m = await orig<typeof import('../../src/litpage/server/agents/runs.ts')>();
  return {
    ...m,
    getRun: (id: string) => {
      const r = m.getRun(id);
      if (gate.hook && r?.payload.blocked) {
        const h = gate.hook;
        gate.hook = null;
        h();
      }
      return r;
    },
    // 대기열(실제 실행) 대신 기록만
    enqueueRun: (n: Parameters<typeof m.insertRun>[0]) => m.insertRun(n),
  };
});

let triggers: typeof import('../../src/litpage/server/agents/triggers.ts');
let runs: typeof import('../../src/litpage/server/agents/runs.ts');
let db: typeof import('../../src/litpage/server/db.ts')['db'];

beforeAll(async () => {
  triggers = await import('../../src/litpage/server/agents/triggers.ts');
  runs = await import('../../src/litpage/server/agents/runs.ts');
  db = (await import('../../src/litpage/server/db.ts')).db;
});

function blockedRun(pageId: string) {
  return runs.insertRun({
    agent: AGENT as never, kind: 'trigger', trigger: AGENT.data.triggers[0] as never, label: '멘션', pageId, status: 'failed',
    payload: { facts: ['막힘'], blocked: true, mention: { label: '멘션', facts: ['원래 멘션'] } },
  }).id;
}
const children = (parent: string) => (db.prepare('SELECT id FROM agent_runs WHERE parent_run_id = ?').all(parent) as { id: string }[]).map((r) => r.id);

describe('막힌 멘션 재시도 — 조건부 저장', () => {
  it('낡은 payload 읽기 → 다른 worker 재시도·선점 → 처음 재시도: 표시 보존·자식 1개·계보 1회', () => {
    const root = blockedRun('pg-race');
    gate.hook = () => {
      for (const c of triggers.retryBlockedMentions('a-ret', 'pg-race')) runs.claimNotifyMe(c);
    };
    triggers.retryBlockedMentions('a-ret', 'pg-race');
    const kids = children(root);
    expect(kids).toHaveLength(1);
    const p = runs.getRun(root)!.payload;
    expect(typeof p.notifyMeSent).toBe('number');
    expect(p.retried).toBe(true);
    expect(p.facts).toEqual(['막힘']);
    expect((p.mention as { facts: string[] }).facts).toEqual(['원래 멘션']);
    for (const c of kids) expect(runs.claimNotifyMe(c)).toBe(false);
  });

  it('정상 재시도 한 번: 자식 1개, 다시 불러도 추가 자식 없음, 다른 칸 보존', () => {
    const root = blockedRun('pg-normal');
    expect(triggers.retryBlockedMentions('a-ret', 'pg-normal')).toHaveLength(1);
    expect(triggers.retryBlockedMentions('a-ret', 'pg-normal')).toHaveLength(0);
    expect(children(root)).toHaveLength(1);
    const p = runs.getRun(root)!.payload;
    expect(p.retried).toBe(true);
    expect(p.blocked).toBe(true);
    expect(p.facts).toEqual(['막힘']);
  });

  it('claimRetry: 최신 payload를 다시 읽어 합침, 두 번째는 false, 없는 실행·읽을 수 없는 payload는 false', () => {
    const claimRetry = (triggers as unknown as { claimRetry?: (id: string) => boolean }).claimRetry;
    expect(typeof claimRetry).toBe('function');
    const root = blockedRun('pg-unit');
    // 읽은 뒤 다른 쪽이 표시를 남긴 상황: claimRetry는 낡은 입력이 아니라 최신 원문을 다시 읽어야 함
    db.prepare('UPDATE agent_runs SET payload = ? WHERE id = ?').run(JSON.stringify({ ...runs.getRun(root)!.payload, notifyMeSent: 123 }), root);
    expect(claimRetry!(root)).toBe(true);
    expect(runs.getRun(root)!.payload.notifyMeSent).toBe(123);
    expect(claimRetry!(root)).toBe(false);
    expect(claimRetry!('없는-실행')).toBe(false);
    const bad = blockedRun('pg-bad');
    db.prepare('UPDATE agent_runs SET payload = ? WHERE id = ?').run('[1,2]', bad);
    expect(claimRetry!(bad)).toBe(false);
    db.prepare('UPDATE agent_runs SET payload = ? WHERE id = ?').run('{깨진', bad);
    expect(claimRetry!(bad)).toBe(false);
  });
});
