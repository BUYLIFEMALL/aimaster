// 2026-11-16 에이전트(정시 실행) 바깥 MCP 연결 열기(플랜 docs/PLAN_20261116_AGENT_MCP.md):
// 연결 명령 열림·프리셋/공유 닫힘, 회원 없는 실행에서 「항상 허용」 쓰기 도구도 검토 필요로 멈춤, 한도는 에이전트 주인 회원 기준.
// 바깥 서버 호출(callMcpTool)은 가짜로 바꾼다 — 실제 외부 호출 0회.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

const calls: { owner: string; tool: string; meter?: string }[] = [];
const fail = { next: false };
vi.mock('../../src/litpage/server/ai/mcp.ts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../src/litpage/server/ai/mcp.ts')>();
  return {
    ...orig,
    callMcpTool: vi.fn(async (owner: string, _c: string, tool: string, _a: unknown, meter?: string) => {
      calls.push({ owner, tool, meter });
      if (fail.next) {
        fail.next = false;
        throw new Error('MCP 서버 응답 없음(가짜)');
      }
      return { text: 'ok', isError: false };
    }),
  };
});

let stage: typeof import('../../src/server/stagePolicy');
let tools: typeof import('../../src/litpage/server/agents/tools.ts');
let runs: typeof import('../../src/litpage/server/agents/runs.ts');
beforeAll(async () => {
  stage = await import('../../src/server/stagePolicy');
  tools = await import('../../src/litpage/server/agents/tools.ts');
  runs = await import('../../src/litpage/server/agents/runs.ts');
});
beforeEach(() => {
  calls.length = 0;
  fail.next = false;
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
  // WS-20261116-05: 서버가 읽기 표시와 삭제 가능 표시를 함께 보낸 모순 도구
  it('읽기·삭제 가능 표시가 함께 온 도구는 혼자 실행에서 검토 필요로 멈춤(「바로 실행」 모드여도)', async () => {
    const ctx = makeCtx(false, { name: 'purge_rows', readOnly: true, destructive: true }, 'auto');
    const out = await tools.runAgentTool(ctx, env, 'mcp_x', { all: true }, 'st1');
    expect(calls).toHaveLength(0);
    expect(ctx.review).toMatchObject({ kind: 'tool', connectionId: 'c1', tool: 'purge_rows' });
    expect(out?.content).toMatch(/needs approval/);
  });
  it('모순 도구도 회원이 「허용」한 그 호출은 한 번만 실행', async () => {
    const ctx = makeCtx(false, { name: 'purge_rows', readOnly: true, destructive: true }, 'allow');
    ctx.approvedCalls.add(tools.callKey('c1', 'purge_rows', { all: true }));
    await tools.runAgentTool(ctx, env, 'mcp_x', { all: true }, 'st1');
    expect(calls).toHaveLength(1);
    expect(ctx.review).toBeNull();
    await tools.runAgentTool(ctx, env, 'mcp_x', { all: true }, 'st2');
    expect(calls).toHaveLength(1);
    expect(ctx.review).toMatchObject({ kind: 'tool', tool: 'purge_rows' });
  });
  it('삭제 가능 표시가 없는 읽기 도구는 그대로 혼자 실행', async () => {
    const ctx = makeCtx(false, { name: 'list_rows', readOnly: true, destructive: false }, 'auto');
    await tools.runAgentTool(ctx, env, 'mcp_x', {}, 'st1');
    expect(calls).toHaveLength(1);
    expect(ctx.review).toBeNull();
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

// ---------------------------------------------------------------- WS-20261116-02: 승인 1번 = 호출 1번(실행 기록에 저장된 승인)
describe('에이전트 바깥 MCP — 승인 소진(실제 시험 DB)', () => {
  const A = { id: 1 };
  const B = { id: 2 };
  const keyA = () => tools.callKey('c1', 'delete_row', A);
  const keyB = () => tools.callKey('c1', 'delete_row', B);
  const agent = { id: 'a1', space_id: 's1' } as never;

  /** 저장된 실행 하나를 「다시 실행」처럼 연다(실행 기록의 payload를 읽어 환경을 만듦 — runs.ts와 같은 방식) */
  function ctxFor(runId: string) {
    const ctx = makeCtx(false, { name: 'delete_row', readOnly: false }, 'allow');
    const run = runs.getRun(runId)!;
    Object.assign(ctx, { runId, approvedCalls: new Set(run.payload.approvedCalls ?? []), consumeApproval: (k: string) => runs.consumeApprovedCall(runId, k) });
    return ctx;
  }
  function needsReview(runId: string, input: object) {
    runs.setRunStatus(runId, 'needs_review' as never, null);
    runs.setRunReview(runId, { kind: 'tool', connectionId: 'c1', tool: 'delete_row', input: input as never, label: 'Run delete_row' });
  }
  function resume(runId: string) {
    const d = runs.decideRunReview(runId, true, 'member-1');
    if (!d || !d.payload) return null;
    return runs.insertRun({ agent, kind: 'trigger', label: '다시 실행', payload: d.payload, parentRunId: runId }).id;
  }

  it('같은 실행을 여러 번 다시 실행해도 먼저 허용한 쓰기는 다시 돌지 않음(A 허용 → B 허용)', async () => {
    const r1 = runs.insertRun({ agent, kind: 'trigger', label: '정시' }).id;
    needsReview(r1, A);
    const r2 = resume(r1)!;
    expect(runs.getRun(r2)!.payload.approvedCalls).toEqual([keyA()]);
    let ctx = ctxFor(r2);
    await tools.runAgentTool(ctx, env, 'mcp_x', A, 's1');
    expect(calls).toHaveLength(1);
    expect(runs.getRun(r2)!.payload.approvedCalls).toEqual([]);
    // r2가 B에서 멈춤 → 허용 → r3에는 B만 넘어감
    needsReview(r2, B);
    const r3 = resume(r2)!;
    expect(runs.getRun(r3)!.payload.approvedCalls).toEqual([keyB()]);
    ctx = ctxFor(r3);
    await tools.runAgentTool(ctx, env, 'mcp_x', A, 's1');
    expect(calls).toHaveLength(1); // A는 다시 검토 필요
    expect(ctx.review).toMatchObject({ tool: 'delete_row', input: A });
    ctx.review = null;
    await tools.runAgentTool(ctx, env, 'mcp_x', B, 's2');
    expect(calls).toHaveLength(2);
  });

  it('허용을 동시에 두 번 눌러도 다시 실행은 하나', () => {
    const r1 = runs.insertRun({ agent, kind: 'trigger', label: '정시' }).id;
    needsReview(r1, A);
    expect(runs.decideRunReview(r1, true, 'member-1')).not.toBeNull();
    expect(runs.decideRunReview(r1, true, 'member-2')).toBeNull();
    expect(runs.decideRunReview(r1, false, 'member-2')).toBeNull();
  });

  it('같은 실행을 두 서버가 동시에 집어 가도 승인된 쓰기는 한 번만', async () => {
    const r1 = runs.insertRun({ agent, kind: 'trigger', label: '정시' }).id;
    needsReview(r1, A);
    const r2 = resume(r1)!;
    const c1 = ctxFor(r2);
    const c2 = ctxFor(r2); // 둘 다 메모리에 승인 A를 들고 시작
    await Promise.all([tools.runAgentTool(c1, env, 'mcp_x', A, 's1'), tools.runAgentTool(c2, env, 'mcp_x', A, 's1')]);
    expect(calls).toHaveLength(1);
    expect([c1.review, c2.review].filter(Boolean)).toHaveLength(1);
  });

  it('성공한 뒤 같은 실행이 다시 돌아도(복구·재시도) 다시 호출하지 않음', async () => {
    const r1 = runs.insertRun({ agent, kind: 'trigger', label: '정시' }).id;
    needsReview(r1, A);
    const r2 = resume(r1)!;
    await tools.runAgentTool(ctxFor(r2), env, 'mcp_x', A, 's1');
    const again = ctxFor(r2);
    await tools.runAgentTool(again, env, 'mcp_x', A, 's1');
    expect(calls).toHaveLength(1);
    expect(again.review).not.toBeNull();
  });

  it('호출이 실패·불확실해도 자동으로 다시 부르지 않음(승인은 소진, 다시 하려면 새로 허용)', async () => {
    const r1 = runs.insertRun({ agent, kind: 'trigger', label: '정시' }).id;
    needsReview(r1, A);
    const r2 = resume(r1)!;
    fail.next = true;
    expect(await tools.runAgentTool(ctxFor(r2), env, 'mcp_x', A, 's1')).toMatchObject({ isError: true });
    expect(runs.getRun(r2)!.payload.approvedCalls).toEqual([]);
    const retry = ctxFor(r2);
    await tools.runAgentTool(retry, env, 'mcp_x', A, 's1');
    expect(calls).toHaveLength(1);
    expect(retry.review).not.toBeNull();
    // 실패 후 다시 검토 → 새로 허용하면 그때 한 번
    needsReview(r2, A);
    const r3 = resume(r2)!;
    await tools.runAgentTool(ctxFor(r3), env, 'mcp_x', A, 's1');
    expect(calls).toHaveLength(2);
  });
});

// ---------------------------------------------------------------- WS-20261116-08: 승인 키는 객체 키 순서와 무관(배열·값·타입은 그대로)
describe('에이전트 바깥 MCP — 승인 키 키 순서', () => {
  const agent = { id: 'a1', space_id: 's1' } as never;
  function ctxFor(runId: string) {
    const ctx = makeCtx(false, { name: 'delete_row', readOnly: false }, 'allow');
    const run = runs.getRun(runId)!;
    Object.assign(ctx, { runId, approvedCalls: new Set(run.payload.approvedCalls ?? []), consumeApproval: (k: string) => runs.consumeApprovedCall(runId, k) });
    return ctx;
  }

  it('중첩 객체 키 순서만 다르면 같은 키, 배열 순서·값·타입·연결·도구가 다르면 다른 키', () => {
    const k = (c: string, t: string, i: unknown) => tools.callKey(c, t, i);
    expect(k('c1', 'x', { b: 1, a: { y: [1, { q: 2, p: 1 }], x: null } })).toBe(k('c1', 'x', { a: { x: null, y: [1, { p: 1, q: 2 }] }, b: 1 }));
    expect(k('c1', 'x', { a: [1, 2] })).not.toBe(k('c1', 'x', { a: [2, 1] }));
    expect(k('c1', 'x', { a: 1 })).not.toBe(k('c1', 'x', { a: '1' }));
    expect(k('c1', 'x', { a: 1 })).not.toBe(k('c1', 'x', { a: 2 }));
    expect(k('c1', 'x', { a: 1 })).not.toBe(k('c2', 'x', { a: 1 }));
    expect(k('c1', 'x', { a: 1 })).not.toBe(k('c1', 'y', { a: 1 }));
    expect(k('c1', 'x', JSON.parse('{"__proto__":{"z":1}}'))).not.toBe(k('c1', 'x', {}));
  });

  it('허용한 뒤 다시 실행에서 모델이 키 순서를 바꿔 만들어도 한 번만 실행(다시 검토 없음)', async () => {
    const r1 = runs.insertRun({ agent, kind: 'trigger', label: '정시' }).id;
    runs.setRunStatus(r1, 'needs_review' as never, null);
    runs.setRunReview(r1, { kind: 'tool', connectionId: 'c1', tool: 'delete_row', input: { b: 2, a: { y: 1, x: 0 } } as never, label: 'Run delete_row' });
    const d = runs.decideRunReview(r1, true, 'member-1')!;
    const r2 = runs.insertRun({ agent, kind: 'trigger', label: '다시 실행', payload: d.payload, parentRunId: r1 }).id;
    const ctx = ctxFor(r2);
    await tools.runAgentTool(ctx, env, 'mcp_x', { a: { x: 0, y: 1 }, b: 2 }, 's1');
    expect(calls).toHaveLength(1);
    expect(ctx.review).toBeNull();
    expect(runs.getRun(r2)!.payload.approvedCalls).toEqual([]);
    await tools.runAgentTool(ctx, env, 'mcp_x', { b: 2, a: { y: 1, x: 0 } }, 's2');
    expect(calls).toHaveLength(1); // 승인은 1번만
    expect(ctx.review).toMatchObject({ tool: 'delete_row' });
  });

  it('배포 전 형식으로 저장된 승인은 같은 입력 순서일 때만 한 번 인정, 다른 연결·인자에는 쓰이지 않음', async () => {
    const legacy = tools.legacyCallKey('c1', 'delete_row', { b: 1, a: 2 });
    const r1 = runs.insertRun({ agent, kind: 'trigger', label: '다시 실행', payload: { approvedCalls: [legacy] } as never }).id;
    let ctx = ctxFor(r1);
    await tools.runAgentTool(ctx, env, 'mcp_x', { b: 1, a: 3 }, 's1'); // 다른 값
    expect(calls).toHaveLength(0);
    ctx.review = null;
    await tools.runAgentTool(ctx, env, 'mcp_x', { b: 1, a: 2 }, 's2'); // 같은 입력·같은 순서
    expect(calls).toHaveLength(1);
    expect(runs.getRun(r1)!.payload.approvedCalls).toEqual([]);
    ctx.review = null;
    await tools.runAgentTool(ctx, env, 'mcp_x', { b: 1, a: 2 }, 's3'); // 다시 쓰이지 않음
    expect(calls).toHaveLength(1);
    // 순서가 다른 옛 형식 승인은 맞추지 않음(막는 쪽)
    const r2 = runs.insertRun({ agent, kind: 'trigger', label: '다시 실행', payload: { approvedCalls: [legacy] } as never }).id;
    ctx = ctxFor(r2);
    await tools.runAgentTool(ctx, env, 'mcp_x', { a: 2, b: 1 }, 's1');
    expect(calls).toHaveLength(1);
    expect(ctx.review).toMatchObject({ tool: 'delete_row' });
  });
});

// ---------------------------------------------------------------- WS-20261116-09: 같은 실행의 동치 승인(새 형식·옛 형식)은 함께 소진, 실제 호출은 1번
describe('에이전트 바깥 MCP — 동치 승인 함께 소진', () => {
  const agent = { id: 'a1', space_id: 's1' } as never;
  const ORDER1 = { b: 1, a: { y: [2, { q: 'x:y', p: 1 }], x: 1 } }; // 정렬 안 된 순서(옛 형식 키 L)
  const ORDER2 = { a: { x: 1, y: [2, { p: 1, q: 'x:y' }] }, b: 1 }; // 같은 값, 다른 키 순서
  const L = () => tools.legacyCallKey('c1', 'delete_row', ORDER1);
  const C = () => tools.callKey('c1', 'delete_row', ORDER2);
  function runWith(approvedCalls: string[]) {
    return runs.insertRun({ agent, kind: 'trigger', label: '다시 실행', payload: { approvedCalls } as never }).id;
  }
  function ctxFor(runId: string) {
    const ctx = makeCtx(false, { name: 'delete_row', readOnly: false }, 'allow');
    const run = runs.getRun(runId)!;
    Object.assign(ctx, { runId, approvedCalls: new Set(run.payload.approvedCalls ?? []), consumeApproval: (k: string | string[]) => runs.consumeApprovedCall(runId, k) });
    return ctx;
  }

  it('전제: 옛 키와 새 키는 문자열이 다르다', () => {
    expect(L()).not.toBe(C());
  });

  for (const [name, first, second] of [['새 순서로 먼저', ORDER2, ORDER1], ['옛 순서로 먼저', ORDER1, ORDER2]] as const) {
    it(`옛 키·새 키가 함께 남아도 같은 호출은 1번만(${name})`, async () => {
      const r = runWith([L(), C()]);
      const ctx = ctxFor(r);
      await tools.runAgentTool(ctx, env, 'mcp_x', first, 's1');
      expect(calls).toHaveLength(1);
      expect(runs.getRun(r)!.payload.approvedCalls).toEqual([]);
      expect([...ctx.approvedCalls]).toEqual([]);
      await tools.runAgentTool(ctx, env, 'mcp_x', second, 's2');
      expect(calls).toHaveLength(1);
      expect(ctx.review).toMatchObject({ tool: 'delete_row' });
    });
  }

  it('다른 값·다른 연결·다른 도구 승인과 다른 실행의 승인은 그대로 남음', async () => {
    const otherValue = tools.callKey('c1', 'delete_row', { ...ORDER2, b: 2 });
    const otherConn = tools.callKey('c2', 'delete_row', ORDER2);
    const otherTool = tools.callKey('c1', 'delete_rows', ORDER2);
    const r = runWith([L(), otherValue, C(), otherConn, otherTool]);
    const rOther = runWith([C()]);
    await tools.runAgentTool(ctxFor(r), env, 'mcp_x', ORDER2, 's1');
    expect(calls).toHaveLength(1);
    expect(runs.getRun(r)!.payload.approvedCalls).toEqual([otherValue, otherConn, otherTool]);
    expect(runs.getRun(rOther)!.payload.approvedCalls).toEqual([C()]);
  });

  it('두 서버가 같은 실행을 동시에 집어 가도 동치 승인으로 1번만', async () => {
    const r = runWith([L(), C()]);
    const a = ctxFor(r);
    const b = ctxFor(r);
    await tools.runAgentTool(a, env, 'mcp_x', ORDER1, 's1');
    await tools.runAgentTool(b, env, 'mcp_x', ORDER2, 's1');
    expect(calls).toHaveLength(1);
    expect(b.review).toMatchObject({ tool: 'delete_row' });
  });

  it('호출이 실패해도 남은 동치 승인으로 다시 부르지 않음, 다음에 새로 허용하면 정상 1번', async () => {
    const r = runWith([L(), C()]);
    const ctx = ctxFor(r);
    fail.next = true;
    await tools.runAgentTool(ctx, env, 'mcp_x', ORDER2, 's1');
    expect(calls).toHaveLength(1);
    await tools.runAgentTool(ctx, env, 'mcp_x', ORDER1, 's2');
    expect(calls).toHaveLength(1);
    expect(runs.getRun(r)!.payload.approvedCalls).toEqual([]);
    // 회원이 명시적으로 새로 허용 → 다음 실행에서 정상 1번
    runs.setRunStatus(r, 'needs_review' as never, null);
    runs.setRunReview(r, { kind: 'tool', connectionId: 'c1', tool: 'delete_row', input: ORDER1 as never, label: 'Run delete_row' });
    const d = runs.decideRunReview(r, true, 'member-1')!;
    const r2 = runs.insertRun({ agent, kind: 'trigger', label: '다시 실행', payload: d.payload, parentRunId: r }).id;
    await tools.runAgentTool(ctxFor(r2), env, 'mcp_x', ORDER2, 's1');
    expect(calls).toHaveLength(2);
  });

  it('값 속 「:」·「__proto__」 키를 접두로 잘못 읽지 않음', () => {
    const input = JSON.parse('{"__proto__":{"z":"a:b"},"k":"c1:delete_row:{}"}');
    expect(tools.approvalMatches(tools.legacyCallKey('c1', 'delete_row', input), 'c1', 'delete_row', input)).toBe(true);
    expect(tools.approvalMatches(tools.callKey('c1', 'delete_row', input), 'c1', 'delete_row', input)).toBe(true);
    expect(tools.approvalMatches(tools.callKey('c1', 'delete_row', {}), 'c1', 'delete_row', input)).toBe(false);
    expect(tools.approvalMatches('c1:delete_row:not json', 'c1', 'delete_row', {})).toBe(false);
    expect(tools.approvalMatches(tools.callKey('c1', 'delete_row', input), 'c1', 'delete_ro', input)).toBe(false);
  });
});
