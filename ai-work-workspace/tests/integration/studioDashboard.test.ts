// 2026-11-17 WS-20261117-13 146 S2 — 관제 대시보드 숫자 모으기(loadStudioData).
// 숫자는 기존 회원 RPC 응답만으로 계산, 출처별 실패는 그 칸만 null, 비서 실행은 최근 7일·비서당 50건·비서 10개 한계 표시, 빈 자료는 0.
// 화면 모듈(router·store·i18n)은 모의 — 서버·DB 없음.
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/litpage/web/lib/api.ts', () => ({ api: vi.fn() }));
vi.mock('../../src/litpage/web/lib/store/records.ts', () => ({ records: { get: () => undefined, mergeRecordMap: () => {} } }));
vi.mock('../../src/litpage/web/lib/store/session.ts', () => ({ useSession: () => null }));
vi.mock('../../src/litpage/web/lib/router.ts', () => ({ navigate: () => {}, openPage: () => {}, spaceDomain: () => 'd' }));
vi.mock('../../src/litpage/web/features/shell/i18n.ts', () => ({ tx: (s: string) => s }));

const { loadStudioData, createStudioGate, RUNS_PER_AGENT, MAX_AGENTS } = await import('../../src/litpage/web/features/home/StudioDashboard.tsx');
const NOW = Date.UTC(2026, 10, 17, 3, 0, 0);
const DAY = 86_400_000;

function fakeApi(over: Record<string, (body: any) => any> = {}) {
  const calls: { name: string; body: any }[] = [];
  const base: Record<string, (body: any) => any> = {
    workInboxList: () => ({ unread: 2, items: [
      { id: 'i1', title: '블로그 원고', source_slug: 'blog', created_at: 'x', imported_at: null },
      { id: 'i2', title: '가져간 것', source_slug: 'shorts', created_at: 'y', imported_at: 'z' },
      { id: 'i3', title: '쇼츠', source_slug: 'shorts', created_at: 'w', imported_at: null },
    ] }),
    getMyTasks: () => ({ taskIds: ['t1', 't2', 't3'], recordMap: { block: {} } }),
    getAgents: () => ({ agents: [{ id: 'a1', alive: true }, { id: 'a2', alive: false }] }),
    getAgentRuns: () => ({ runs: [
      { status: 'success', createdTime: NOW - DAY },
      { status: 'failed', createdTime: NOW - 2 * DAY },
      { status: 'needs_review', createdTime: NOW - 3 * DAY },
      { status: 'success', createdTime: NOW - 8 * DAY }, // 7일 밖
      { status: 'in_progress', createdTime: NOW - DAY },
    ] }),
  };
  const call = async (name: string, body: unknown) => {
    calls.push({ name, body });
    const fn = over[name] ?? base[name];
    if (!fn) throw new Error('unknown ' + name);
    return fn(body);
  };
  return { call, calls };
}

describe('관제 대시보드 숫자', () => {
  it('기존 RPC 값만: 받은 업무 대기(가져가지 않은 것만 목록), 내 할 일 수, 최근 7일 성공·실패·검토, 지운 비서 제외', async () => {
    const { call, calls } = fakeApi();
    const d = await loadStudioData(call, 's1', NOW);
    expect(d.inbox).toEqual({ unread: 2, recent: [
      { id: 'i1', title: '블로그 원고', source: 'blog', createdAt: 'x' },
      { id: 'i3', title: '쇼츠', source: 'shorts', createdAt: 'w' },
    ] });
    expect(d.tasks).toEqual({ count: 3, ids: ['t1', 't2', 't3'] });
    expect(d.runs).toEqual({ success: 1, failed: 1, review: 1, agents: 1, capped: false });
    expect(d.recordMaps).toHaveLength(1);
    expect(calls.filter((c) => c.name === 'getAgentRuns').map((c) => c.body)).toEqual([{ agentId: 'a1', limit: RUNS_PER_AGENT }]);
  });

  it('출처 하나가 실패하면 그 칸만 null(다른 칸은 그대로)', async () => {
    const { call } = fakeApi({ getMyTasks: () => { throw new Error('x'); }, getAgentRuns: () => { throw new Error('y'); } });
    const d = await loadStudioData(call, 's1', NOW);
    expect(d.tasks).toBeNull();
    expect(d.runs).toBeNull();
    expect(d.inbox?.unread).toBe(2);
  });

  it('자료가 없으면 0(가짜 숫자 없음), 비서 없음 = agents 0', async () => {
    const { call } = fakeApi({ workInboxList: () => ({}), getMyTasks: () => ({}), getAgents: () => ({ agents: [] }) });
    const d = await loadStudioData(call, 's1', NOW);
    expect(d.inbox).toEqual({ unread: 0, recent: [] });
    expect(d.tasks).toEqual({ count: 0, ids: [] });
    expect(d.runs).toEqual({ success: 0, failed: 0, review: 0, agents: 0, capped: false });
  });

  it('비서 10개 넘거나 한 비서 기록이 50건 꽉 차면 capped(화면에 「최근 기록 기준」), 비서는 10개까지만 조회', async () => {
    const many = Array.from({ length: MAX_AGENTS + 2 }, (_, i) => ({ id: `a${i}`, alive: true }));
    const { call, calls } = fakeApi({ getAgents: () => ({ agents: many }), getAgentRuns: () => ({ runs: [] }) });
    const d = await loadStudioData(call, 's1', NOW);
    expect(d.runs?.capped).toBe(true);
    expect(calls.filter((c) => c.name === 'getAgentRuns')).toHaveLength(MAX_AGENTS);
    const full = Array.from({ length: RUNS_PER_AGENT }, () => ({ status: 'success', createdTime: NOW - 20 * DAY }));
    const b = fakeApi({ getAgentRuns: () => ({ runs: full }) });
    const d2 = await loadStudioData(b.call, 's1', NOW);
    expect(d2.runs).toMatchObject({ capped: true, success: 0 });
  });
});

describe('QA013 문맥 전환(createStudioGate)', () => {
  it('A 요청 뒤 B로 바꾸면 늦게 온 A 결과는 버리고 B만 받음', () => {
    const g = createStudioGate();
    const a = g.begin('u1|spaceA');
    const b = g.begin('u1|spaceB');
    expect(g.isCurrent(a)).toBe(false);
    expect(g.isCurrent(b)).toBe(true);
  });
  it('같은 워크스페이스에서 계정이 바뀌어도 이전 계정 결과는 버림', () => {
    const g = createStudioGate();
    const x = g.begin('u1|s1');
    const y = g.begin('u2|s1');
    expect(g.isCurrent(x)).toBe(false);
    expect(g.isCurrent(y)).toBe(true);
  });
  it('같은 문맥을 다시 시작(새로고침)하면 이전 요청은 버리고 마지막 것만', () => {
    const g = createStudioGate();
    const first = g.begin('u1|s1');
    const again = g.begin('u1|s1');
    expect(g.isCurrent(first)).toBe(false);
    expect(g.isCurrent(again)).toBe(true);
  });
});
