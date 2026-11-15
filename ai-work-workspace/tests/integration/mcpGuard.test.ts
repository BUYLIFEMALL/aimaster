// 2026-11-15 업무 비서 바깥 MCP 호출: AI 채팅 연결 명령은 열고 에이전트 연결·프리셋은 닫음, 회원당 1분 30번·하루 500번.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let guard: typeof import('../../src/litpage/server/aimasterMcpGuard.ts');
let stage: typeof import('../../src/server/stagePolicy');
let svc: typeof import('../../src/litpage/server/ai/service.ts');
beforeAll(async () => {
  guard = await import('../../src/litpage/server/aimasterMcpGuard.ts');
  stage = await import('../../src/server/stagePolicy');
  svc = await import('../../src/litpage/server/ai/service.ts');
});

describe('바깥 MCP — 열린 명령', () => {
  it('AI 채팅 연결은 열고, 에이전트 연결·프리셋·응답 사본 메일은 닫음', () => {
    for (const n of ['aiListConnections', 'aiAddConnection', 'aiRefreshConnection', 'aiUpdateConnection', 'aiRemoveConnection']) expect(stage.stageBlock(n)).toBeNull();
    for (const n of ['addAgentConnection', 'removeAgentConnection', 'mcpListPresets', 'mcpCreatePreset']) expect(stage.stageBlock(n)).not.toBeNull();
  });
  it('원본 승인 규칙: 「모두 건너뛰기」면 쓰기 도구도 통과 — 그래서 service.ts가 MCP만 따로 항상 묻는다', () => {
    expect(svc.needsApproval('skip_all', 'share')).toBe(false);
    expect(svc.needsApproval('always_ask', 'share')).toBe(true);
  });
});

describe('바깥 MCP — 호출 한도', () => {
  it('1분 30번, 오늘 쓴 횟수는 보낸 만큼', () => {
    const t0 = Date.parse('2026-11-15T03:00:00Z');
    for (let i = 0; i < 30; i++) expect(guard.memberMcpGate('m-a', t0 + i)).toBeNull();
    expect(guard.memberMcpGate('m-a', t0 + 100)).toMatch(/1분에 30번/);
    expect(guard.mcpUsedToday('m-a', t0)).toBe(30);
    expect(guard.memberMcpGate('m-b', t0 + 100)).toBeNull();
  });
  it('하루 500번', () => {
    const t0 = Date.parse('2026-11-16T00:10:00Z');
    for (let i = 0; i < 500; i++) expect(guard.memberMcpGate('m-c', t0 + i * 3_000)).toBeNull();
    expect(guard.memberMcpGate('m-c', t0 + 500 * 3_000 + 60_000)).toMatch(/하루 500번/);
  });
});
