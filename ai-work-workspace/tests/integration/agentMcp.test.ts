// 2026-11-16 에이전트(정시 실행) 바깥 MCP 연결 열기(플랜 docs/PLAN_20261116_AGENT_MCP.md):
// 연결 명령 열림·프리셋/공유 닫힘, 회원 없는 실행에서 「항상 허용」 쓰기 도구도 검토 필요로 멈춤, 한도는 에이전트 주인 회원 기준.
// 바깥 서버 호출(callMcpTool)은 가짜로 바꾼다 — 실제 외부 호출 0회.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

const calls: { owner: string; tool: string; meter?: string }[] = [];
vi.mock('../../src/litpage/server/ai/mcp.ts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../src/litpage/server/ai/mcp.ts')>();
  return {
    ...orig,
    callMcpTool: vi.fn(async (owner: string, _c: string, tool: string, _a: unknown, meter?: string) => {
      calls.push({ owner, tool, meter });
      return { text: 'ok', isError: false };
    }),
  };
});

let stage: typeof import('../../src/server/stagePolicy');
let tools: typeof import('../../src/litpage/server/agents/tools.ts');
beforeAll(async () => {
  stage = await import('../../src/server/stagePolicy');
  tools = await import('../../src/litpage/server/agents/tools.ts');
});
beforeEach(() => {
  calls.length = 0;
});

function makeCtx(interactive: boolean, tool: { name: string; readOnly?: boolean; destructive?: boolean }, mode: 'auto' | 'ask' | 'allow') {
  const mcp = new Map([['mcp_x', { connectionId: 'c1', connectionName: '테스트 서버', tool: { inputSchema: {}, ...tool } as never, mode }]]);
  return {
    agent: { id: 'a1', bot_id: 'bot-1', created_by_id: 'member-1', space_id: 's1', data: { name: '에이전트' } },
    runId: 'r1', kind: 'trigger', interactive, actorId: null, canConfigure: false, chain: [], allowedHosts: new Set<string>(), allowAllUrls: false,
    mcp, approvedCalls: new Set<string>(), review: null, notificationsSent: 0, callSubAgent: async () => '',
  } as never as import('../../src/litpage/server/agents/tools.ts').RunToolContext;
}
const env = { userId: 'member-1', step: () => {}, approve: vi.fn(async () => 'accept') } as never as Parameters<typeof import('../../src/litpage/server/agents/tools.ts').runAgentTool>[1];

describe('에이전트 바깥 MCP — 열린 명령', () => {
  it('연결 명령 4개는 열고, 에이전트 공유·MCP 프리셋은 계속 닫음', () => {
    for (const n of ['addAgentConnection', 'refreshAgentConnection', 'updateAgentConnection', 'removeAgentConnection']) expect(stage.stageBlock(n)).toBeNull();
    for (const n of ['getAgentSharing', 'setAgentPermissions', 'transferAgentOwnership', 'mcpListPresets', 'mcpCreatePreset']) expect(stage.stageBlock(n)).not.toBeNull();
  });
});

describe('에이전트 바깥 MCP — 회원 없는 실행', () => {
  it('「항상 허용」 쓰기 도구도 실행하지 않고 검토 필요로 멈춤', async () => {
    const ctx = makeCtx(false, { name: 'delete_row', readOnly: false, destructive: true }, 'allow');
    const out = await tools.runAgentTool(ctx, env, 'mcp_x', { id: 1 }, 'st1');
    expect(calls).toHaveLength(0);
    expect(ctx.review).toMatchObject({ kind: 'tool', connectionId: 'c1', tool: 'delete_row' });
    expect(out?.content).toMatch(/needs approval/);
  });
  it('회원이 「허용」을 누른 그 호출은 다시 실행됨', async () => {
    const ctx = makeCtx(false, { name: 'delete_row', readOnly: false }, 'allow');
    ctx.approvedCalls.add(tools.callKey('c1', 'delete_row', { id: 1 }));
    await tools.runAgentTool(ctx, env, 'mcp_x', { id: 1 }, 'st1');
    expect(calls).toHaveLength(1);
    expect(ctx.review).toBeNull();
    // 같은 승인으로 두 번째 실행은 안 됨(다시 검토 필요)
    await tools.runAgentTool(ctx, env, 'mcp_x', { id: 1 }, 'st2');
    expect(calls).toHaveLength(1);
    expect(ctx.review).toMatchObject({ kind: 'tool', tool: 'delete_row' });
  });
  it('읽기 도구는 혼자 실행 — 한도는 봇이 아니라 에이전트 주인 회원 기준', async () => {
    const ctx = makeCtx(false, { name: 'list_rows', readOnly: true }, 'auto');
    await tools.runAgentTool(ctx, env, 'mcp_x', {}, 'st1');
    expect(calls).toEqual([{ owner: 'bot-1', tool: 'list_rows', meter: 'member-1' }]);
  });
});

describe('에이전트 바깥 MCP — 채팅 중(회원이 보고 있음)', () => {
  it('「항상 허용」으로 둔 쓰기 도구는 회원 설정대로 바로 실행', async () => {
    const ctx = makeCtx(true, { name: 'add_row', readOnly: false }, 'allow');
    await tools.runAgentTool(ctx, env, 'mcp_x', {}, 'st1');
    expect(calls).toHaveLength(1);
    expect(ctx.review).toBeNull();
  });
  it('다른 회원이 남의 에이전트와 대화하면 한도는 대화하는 회원 기준(주인 한도를 대신 쓰지 못함)', async () => {
    const ctx = makeCtx(true, { name: 'list_rows', readOnly: true }, 'auto');
    (ctx as { actorId: string | null }).actorId = 'member-2';
    await tools.runAgentTool(ctx, env, 'mcp_x', {}, 'st1');
    expect(calls).toEqual([{ owner: 'bot-1', tool: 'list_rows', meter: 'member-2' }]);
  });
  it('「확인」 모드 쓰기 도구는 채팅 중 회원에게 묻고, 거절하면 실행하지 않음', async () => {
    const ctx = makeCtx(true, { name: 'add_row', readOnly: false }, 'ask');
    const deny = { ...(env as object), approve: vi.fn(async () => 'decline') } as never as typeof env;
    await tools.runAgentTool(ctx, deny, 'mcp_x', {}, 'st1');
    expect(calls).toHaveLength(0);
  });
});
