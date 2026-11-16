// PLAN-20261117-01 E1(2026-11-17) 시험 — 로컬 Docker Postgres(aww-pg-test)만 쓴다.
// 1. 「월요일 주간 요약」 템플릿: 월요일 08:00 정시 트리거.
// 2. 「회의 준비·정리」 템플릿: 만든 사람의 회의록 요약에서만 도는 트리거(다른 사람 회의록으로 주인 키 비용이 나가지 않게).
// 3. notify_me: 받는 사람은 에이전트 주인 본인뿐, 한 실행에 한 번, 페이지 링크 필수, 실패 사유는 오류로 돌려줌.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

// 페이지 열람 권한: 시험용 페이지 'p-ok'만 열 수 있음
vi.mock('../../src/litpage/server/ai/context.ts', async (orig) => ({
  ...(await orig<typeof import('../../src/litpage/server/ai/context.ts')>()),
  canRead: (pageId: string) => pageId === 'p-ok',
}));

let tools: typeof import('../../src/litpage/server/agents/tools.ts');
let templates: typeof import('../../src/litpage/server/agents/templates.ts');
let engine: typeof import('../../src/litpage/server/automations/engine.ts');

beforeAll(async () => {
  tools = await import('../../src/litpage/server/agents/tools.ts');
  templates = await import('../../src/litpage/server/agents/templates.ts');
  engine = await import('../../src/litpage/server/automations/engine.ts');
});

function makeCtx(owner?: string) {
  return {
    agent: { id: `a-${Math.random()}`, bot_id: 'bot-1', created_by_id: 'creator-1', ...(owner ? { owner_id: owner } : {}), space_id: 's1', data: { name: '주간 요약' } },
    runId: 'r1', kind: 'trigger', interactive: false, actorId: null, canConfigure: false, chain: [], allowedHosts: new Set<string>(), allowAllUrls: false,
    mcp: new Map(), approvedCalls: new Set<string>(), review: null, notificationsSent: 0, callSubAgent: async () => '',
  } as never as import('../../src/litpage/server/agents/tools.ts').RunToolContext;
}
const env = { userId: 'creator-1', step: () => {}, approve: vi.fn(async () => 'accept') } as never as Parameters<typeof import('../../src/litpage/server/agents/tools.ts').runAgentTool>[1];

describe('E1 템플릿 트리거', () => {
  it('월요일 주간 요약은 월요일 08:00 정시 실행', () => {
    const t = templates.templateById('weekly-summary')!;
    expect(t).toBeTruthy();
    const trg = templates.templateTriggers(t, 'Asia/Seoul', '2026-11-17', 'creator-1');
    expect(trg).toHaveLength(1);
    expect(trg[0]).toMatchObject({ type: 'recurrence', recurrence: { frequency: 'week', weekdays: [1], time: '08:00', time_zone: 'Asia/Seoul' } });
  });
  it('회의 준비·정리는 만든 사람의 회의록 요약에서만 실행', () => {
    const t = templates.templateById('meeting-prep')!;
    const trg = templates.templateTriggers(t, 'Asia/Seoul', '2026-11-17', 'creator-1');
    expect(trg).toEqual([expect.objectContaining({ type: 'lit.meeting_note_summarized', enabled: true, user_filter: ['creator-1'] })]);
    // 만든 사람을 모르면 회의록 트리거를 걸지 않는다(누구 회의록에서나 도는 일 방지)
    expect(templates.templateTriggers(t, 'Asia/Seoul', '2026-11-17')).toEqual([]);
  });
  it('다른 템플릿의 트리거는 그대로(정시만)', () => {
    const t = templates.templateById('weekly-report')!;
    expect(templates.templateTriggers(t, 'Asia/Seoul', '2026-11-17', 'creator-1').map((x) => x.type)).toEqual(['recurrence']);
  });
});

describe('E1 notify_me', () => {
  it('에이전트 도구 목록에 있다', () => {
    expect(tools.agentToolNames({ sub_agents: [] } as never, { canConfigure: false, web: false })).toContain('notify_me');
  });
  it('받는 사람은 에이전트 주인(owner_id, 없으면 만든 사람) 한 명, 한 실행에 한 번', async () => {
    const sent: unknown[] = [];
    engine.setExternalNotifyHandler(async (n) => { sent.push(n); return []; });
    const ctx = makeCtx('owner-9');
    const out = await tools.runAgentTool(ctx, env, 'notify_me', { channels: ['email', 'kakao', 'email'], message: '이번 주 마감 3건', page_id: 'p-ok' }, 's1');
    expect(out?.isError).toBeFalsy();
    expect(sent).toEqual([expect.objectContaining({ userId: 'owner-9', channels: ['email', 'kakao'], text: '이번 주 마감 3건', pageId: 'p-ok', spaceId: 's1' })]);
    const again = await tools.runAgentTool(ctx, env, 'notify_me', { channels: ['email'], message: '또', page_id: 'p-ok' }, 's2');
    expect(again?.isError).toBe(true);
    expect(sent).toHaveLength(1);
    // owner_id가 없으면 만든 사람
    await tools.runAgentTool(makeCtx(), env, 'notify_me', { channels: ['kakao'], message: 'x', page_id: 'p-ok' }, 's3');
    expect((sent[1] as { userId: string }).userId).toBe('creator-1');
  });
  it('열 수 없는 페이지·빈 채널·빈 내용은 보내지 않는다', async () => {
    const sent: unknown[] = [];
    engine.setExternalNotifyHandler(async (n) => { sent.push(n); return []; });
    expect((await tools.runAgentTool(makeCtx(), env, 'notify_me', { channels: ['email'], message: 'x', page_id: 'p-no' }, 's1'))?.isError).toBe(true);
    expect((await tools.runAgentTool(makeCtx(), env, 'notify_me', { channels: ['sms'], message: 'x', page_id: 'p-ok' }, 's1'))?.isError).toBe(true);
    expect((await tools.runAgentTool(makeCtx(), env, 'notify_me', { channels: ['email'], message: '  ', page_id: 'p-ok' }, 's1'))?.isError).toBe(true);
    expect(sent).toHaveLength(0);
  });
  it('채널 실패 사유는 오류로 돌려준다(페이지는 이미 남아 있음)', async () => {
    engine.setExternalNotifyHandler(async () => ['카카오톡: 연결이 필요합니다']);
    const out = await tools.runAgentTool(makeCtx(), env, 'notify_me', { channels: ['kakao'], message: 'x', page_id: 'p-ok' }, 's1');
    expect(out?.isError).toBe(true);
    expect(out?.content).toContain('카카오톡: 연결이 필요합니다');
  });
  it('발송 경로가 없으면 보내지 않고 오류', async () => {
    engine.setExternalNotifyHandler(null);
    const out = await tools.runAgentTool(makeCtx(), env, 'notify_me', { channels: ['email'], message: 'x', page_id: 'p-ok' }, 's1');
    expect(out?.isError).toBe(true);
  });
});

describe('E1 작업 시간 기록 템플릿', () => {
  it('예시 행(09:00~11:30, 시간당 3만 원) → 걸린 시간 2.5시간·청구 금액 75000', async () => {
    const { OpsBuilder } = await import('../../src/litpage/server/content/spec.ts');
    const { TEMPLATES } = await import('../../src/litpage/server/content/catalog.ts');
    const { evaluateFormula } = await import('../../src/litpage/shared/formula/index.ts');
    const t = TEMPLATES.find((x) => x.id === 'time-tracker')!;
    expect(t).toBeTruthy();
    const b = new OpsBuilder('sp-e1', 'u-e1');
    b.block(t.build() as never, 'sp-e1', 'space');
    const sets = b.ops.filter((o) => o.command === 'set');
    const col = sets.find((o) => o.pointer.table === 'collection')!.args as { schema: Record<string, never> };
    const row = sets.find((o) => o.pointer.table === 'block' && (o.args as { parent_table?: string }).parent_table === 'collection')!.args as never;
    const ctx = { timeZone: 'Asia/Seoul' } as never;
    const hrs = evaluateFormula('', row, col.schema, ctx, { propId: 'tHrs', prop: col.schema.tHrs });
    const amt = evaluateFormula('', row, col.schema, ctx, { propId: 'tAmt', prop: col.schema.tAmt });
    expect(hrs.error).toBeFalsy();
    expect(amt.error).toBeFalsy();
    expect((hrs as { number?: number }).number).toBe(2.5);
    expect((amt as { number?: number }).number).toBe(75000);
  });
});
