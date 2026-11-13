// U14 1단계 — MCP 서버(2026-11-13, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-4). 로컬 Docker Postgres(aww-pg-test)만 쓴다.
// 1. 토큰·연결 도구 관리 명령은 열리고, 바깥 MCP 서버 등록(프리셋)·에이전트 바깥 연결은 계속 닫힌다.
// 2. 회원당 토큰 5개까지(한국어 안내), 90일 지난 토큰은 거절, 토큰당 분당 60회.
// 3. 맞는 토큰이면 토큰 주인 회원 권한으로 initialize·tools/list가 동작한다.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';
import { stageBlock } from '@/server/stagePolicy';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let db: typeof import('../../src/litpage/server/db.ts');
let mcp: typeof import('../../src/litpage/server/ai/litMcp.ts');

const cat = { id: '55555555-5555-4555-8555-555555555555', email: 'cat@example.com', name: '캣' };
let spaceId = '';

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  db = await import('../../src/litpage/server/db.ts');
  mcp = await import('../../src/litpage/server/ai/litMcp.ts');
  await runtime.runRpc('loadAccountData', {}, cat);
  const r = await runtime.runRpc('createWorkspace', { name: '캣 팀' }, cat);
  expect(r.status).toBe(200);
  spaceId = (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id;
  expect(spaceId).toBeTruthy();
});

const rpc = (token: string, body: unknown) => db.withRequestCache(() => mcp.handleMcpHttp(`Bearer ${token}`, body));

describe('U14 MCP 서버 1단계', () => {
  it('토큰·연결 도구 관리는 열리고, 프리셋·에이전트 바깥 연결은 닫혀 있다', () => {
    for (const name of ['mcpListTokens', 'mcpCreateToken', 'mcpRevokeToken', 'mcpListClients', 'mcpDisableMyClient']) expect(stageBlock(name)).toBeNull();
    for (const name of ['mcpCreatePreset', 'mcpListPresets', 'mcpDeletePreset', 'addAgentConnection', 'devCreateToken']) expect(stageBlock(name)).not.toBeNull();
  });

  let token = '';
  it('토큰은 회원당 5개까지 만들고 6번째는 한국어로 거절한다', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await runtime.runRpc('mcpCreateToken', { spaceId, name: `도구 ${i}` }, cat);
      expect(r.status).toBe(200);
      if (i === 0) token = (r.body as any).token;
    }
    expect(token).toMatch(/^lp_pat_/);
    const sixth = await runtime.runRpc('mcpCreateToken', { spaceId, name: '여섯 번째' }, cat);
    expect(sixth.status).toBe(400);
    expect((sixth.body as any).message).toContain('5개까지');
  });

  it('맞는 토큰이면 initialize·tools/list가 토큰 주인 권한으로 동작한다', async () => {
    const init = await rpc(token, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', clientInfo: { name: 'Claude Desktop' }, capabilities: {} } });
    expect(init.status).toBe(200);
    expect((init.body as any).result.serverInfo).toBeTruthy();
    const list = await rpc(token, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(list.status).toBe(200);
    expect((list.body as any).result.tools.map((t: any) => t.name)).toContain('lit-search');
    expect(db.withRequestCache(() => mcp.mcpTokenOwner(`Bearer ${token}`))).toEqual({ userId: cat.id, expired: false });
  });

  it('틀린 토큰은 401, 토큰당 분당 60회를 넘으면 429', async () => {
    expect((await rpc('lp_pat_' + 'x'.repeat(32), { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(401);
    const second = (await runtime.runRpc('mcpListTokens', { spaceId }, cat)).body as any;
    expect(second.tokens).toHaveLength(5);
    const codes: number[] = [];
    for (let i = 0; i < 61; i++) codes.push((await rpc(token, { jsonrpc: '2.0', id: i, method: 'ping' })).status);
    expect(codes.filter((c) => c === 200).length).toBeLessThanOrEqual(60);
    expect(codes.at(-1)).toBe(429);
  });

  it('발급 뒤 90일이 지난 토큰은 만료로 거절한다', async () => {
    const created = await runtime.runRpc('mcpRevokeToken', { tokenId: ((await runtime.runRpc('mcpListTokens', { spaceId }, cat)).body as any).tokens[0].id }, cat);
    expect(created.status).toBe(200);
    const fresh = (await runtime.runRpc('mcpCreateToken', { spaceId, name: '오래된 토큰' }, cat)).body as any;
    db.db.prepare('UPDATE mcp_tokens SET created_time = ? WHERE id = ?').run(Date.now() - 91 * 86_400_000, fresh.info.id);
    expect(db.withRequestCache(() => mcp.mcpTokenOwner(`Bearer ${fresh.token}`))?.expired).toBe(true);
    expect((await rpc(fresh.token, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(401);
  });
});
