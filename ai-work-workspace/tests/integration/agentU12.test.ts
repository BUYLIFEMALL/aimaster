// U12 업무 비서(2026-11-10) — 플랜 docs/PLAN_20261110_U12_AGENT.md §5 시험. 로컬 Docker Postgres(aww-pg-test)만 쓴다.
// 1. 에이전트 명령이 열리고, 공유·주인 넘기기·바깥 연결은 계속 닫힌다. 자동화 「에이전트」 동작 저장 허용, 웹훅은 거절.
// 2. 백그라운드 실행은 지금 요청 맥락(다른 회원 키)이 아니라 「에이전트 주인 회원의 본인 키」로 실행된다.
// 3. 정시 에이전트 작업(agent-recurrence)은 주인 회원의 정시 실행에서만 돈다.
// 4. 멈춘 실행 정리·대기 실행 다시 넣기는 그 회원 에이전트만 건드린다.
// 5. 요금제 조건 없음(AIMaster 이용 권한이 정함), 새 에이전트 기본 월 상한 700, 웹 검색 꺼짐.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';
import { stageBlock, stageBodyBlock } from '@/server/stagePolicy';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

// 회원 키는 공용 표 대신 시험용 값(회원마다 다른 Claude 키)
vi.mock('@/server/memberAiKeys', () => ({
  loadMemberAiKeys: async (userId: string) => ({ anthropicKey: `key-of-${userId}`, provider: 'anthropic' }),
  hasMemberAiKey: () => true,
  forgetMemberAiKeys: () => {},
}));

let db: typeof import('../../src/litpage/server/db.ts');
let scheduler: typeof import('../../src/litpage/server/scheduler.ts');
let jobs: typeof import('../../src/server/memberJobs.ts');
let agentRuns: typeof import('../../src/server/agentRuns.ts');
let runs: typeof import('../../src/litpage/server/agents/runs.ts');
let model: typeof import('../../src/litpage/server/agents/model.ts');
let config: typeof import('../../src/litpage/server/ai/providers/config.ts');

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  scheduler = await import('../../src/litpage/server/scheduler.ts');
  jobs = await import('../../src/server/memberJobs.ts');
  agentRuns = await import('../../src/server/agentRuns.ts');
  runs = await import('../../src/litpage/server/agents/runs.ts');
  model = await import('../../src/litpage/server/agents/model.ts');
  config = await import('../../src/litpage/server/ai/providers/config.ts');
});

function putAgent(id: string, owner: string, alive = true) {
  db.putRecord('workflow', { id, version: 0, space_id: `sp-${owner}`, parent_id: `sp-${owner}`, parent_table: 'space', alive, owner_id: owner, data: { triggers: [] } } as never);
}

describe('U12 에이전트 열기', () => {
  it('에이전트 만들기·실행·조회 명령이 열려 있다', () => {
    for (const name of ['getAgents', 'createAgent', 'saveAgent', 'runAgent', 'listAgentTemplates', 'setAgentCreditLimit', 'getAgentRuns']) expect(stageBlock(name)).toBeNull();
  });
  it('공유·권한·주인 넘기기·바깥 연결·관리자 기능은 계속 닫혀 있다', () => {
    for (const name of ['getAgentSharing', 'setAgentPermissions', 'transferAgentOwnership', 'addAgentConnection', 'updateAgentConnection', 'adminListAgents', 'mcpConnect']) {
      expect(stageBlock(name)).not.toBeNull();
    }
  });
  it('자동화 「에이전트」 동작 저장은 통과하고 웹훅은 한국어 안내와 함께 거절된다', () => {
    expect(stageBodyBlock('saveAutomation', { automation: { actions: [{ type: 'agent' }] } })).toBeNull();
    const r = stageBodyBlock('saveAutomation', { automation: { actions: [{ type: 'webhook' }] } });
    expect(r?.status).toBe(403);
    expect(r?.message).toContain('준비 중');
  });
  it('요금제 조건 없이 쓸 수 있고, 웹 검색은 회원 키 AI 내장 검색만(2026-11-13), 기본 월 상한은 700이다', () => {
    expect(model.agentsAvailable({ id: 's', plan_type: 'plus' } as never)).toBe(true);
    expect(model.agentsAvailable(undefined)).toBe(false);
    expect(runs.AGENT_WEB_ENABLED).toBe(true);
    // 우리 서버가 바깥 주소를 가져오지 않게: Claude만 페이지 읽기(Anthropic 실행), OpenAI는 내장 검색만, Gemini·키 없음은 끔
    expect(runs.memberWebMode('anthropic')).toEqual({ search: true, fetch: true });
    expect(runs.memberWebMode('openai')).toEqual({ search: true, fetch: false });
    expect(runs.memberWebMode('gemini')).toEqual({ search: false, fetch: false });
    expect(runs.memberWebMode(null)).toEqual({ search: false, fetch: false });
    expect(model.DEFAULT_AGENT_CREDIT_LIMIT).toBe(700);
  });
});

describe('U12 주인 회원 키로만 실행', () => {
  it('다른 회원 요청 맥락 안에서도 에이전트 주인의 키로 실행된다', async () => {
    putAgent('ag-b', 'member-b');
    const seen = await config.withMemberAiKeys({ anthropicKey: 'key-of-member-a', provider: 'anthropic' }, () =>
      agentRuns.runWithOwnerKeys('ag-b', async () => config.anthropicKey()),
    );
    expect(seen).toBe('key-of-member-b');
  });
  it('주인을 못 찾으면 빈 키 — 지금 요청 회원의 키로 대신하지 않는다', async () => {
    const seen = await config.withMemberAiKeys({ anthropicKey: 'key-of-member-a', provider: 'anthropic' }, () =>
      agentRuns.runWithOwnerKeys('no-such-agent', async () => config.anthropicKey()),
    );
    expect(seen).not.toBe('key-of-member-a');
  });
});

describe('U12 정시 에이전트·대기 실행 나누기', () => {
  it('정시 에이전트 작업은 주인 회원의 작업으로 센다', () => {
    putAgent('ag-c', 'member-c');
    scheduler.scheduleJob('agent-recurrence', 'agent-recur:ag-c:t1', Date.now() + 3_600_000, { agentId: 'ag-c', triggerId: 't1', fp: '{}' });
    expect(jobs.countMemberJobs('member-c')).toBe(1);
    expect(jobs.countMemberJobs('member-b')).toBe(0);
    expect(jobs.jobOwner({ kind: 'agent-recurrence', payload: { agentId: 'ag-c' } })).toBe('member-c');
  });
  it('지워진 에이전트의 정시 작업은 주인이 없다', () => {
    putAgent('ag-dead', 'member-c', false);
    expect(jobs.jobOwner({ kind: 'agent-recurrence', payload: { agentId: 'ag-dead' } })).toBeNull();
  });
  it('회원 에이전트 목록·멈춘 실행 정리는 그 회원 것만 건드린다', () => {
    putAgent('ag-d1', 'member-d');
    putAgent('ag-e1', 'member-e');
    expect(agentRuns.memberAgentIds('member-d')).toEqual(['ag-d1']);
    const old = Date.now() - 60 * 60_000;
    const ins = db.db.prepare('INSERT INTO agent_runs (id, agent_id, space_id, kind, status, held, created_time, started_time) VALUES (?, ?, ?, ?, ?, 0, ?, ?)');
    ins.run('run-d', 'ag-d1', 'sp-member-d', 'trigger', 'running', old, old);
    ins.run('run-e', 'ag-e1', 'sp-member-e', 'trigger', 'running', old, old);
    runs.recoverAgentRuns(agentRuns.memberAgentIds('member-d'));
    const status = (id: string) => (db.db.prepare('SELECT status FROM agent_runs WHERE id = ?').get(id) as { status: string }).status;
    expect(status('run-d')).toBe('failed');
    expect(status('run-e')).toBe('running');
  });
});
