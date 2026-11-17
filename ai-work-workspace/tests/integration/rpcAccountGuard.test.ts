// 2026-11-17 WS-20261117-17 QA017(Master msg_72c6254fc339) — /api/rpc/[name] 실제 POST 처리기의 「화면이 기대한 계정」 검사.
// 로그인·명령 실행·AI 키·모델 목록·후처리는 모두 모의(서버·DB·외부 없음). 헤더는 인증 근거가 아니라 기존 화면의 기대 id 비교일 뿐 — 서버 인가는 그대로.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  sessionUser: 'uB',
  runRpc: vi.fn(async () => ({ status: 200, body: { ok: true } })),
  loadKeys: vi.fn(async () => ({})),
  warm: vi.fn(async () => {}),
  afterRpc: vi.fn(async () => {}),
  after: vi.fn(),
}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: h.after }));
vi.mock('@/lib/access', () => ({ checkProgramAccessApi: async () => ({ allowed: true, user: { id: h.sessionUser, email: 'x@example.com' } }) }));
vi.mock('@/server/runtime', () => ({ runRpc: h.runRpc }));
vi.mock('@/server/memberJobs', () => ({ trackMemberJobs: async (fn: () => Promise<unknown>) => ({ result: await fn(), scheduled: [] }) }));
vi.mock('@/server/memberScheduling', () => ({ afterRpc: h.afterRpc }));
vi.mock('@/server/member', () => ({ memberFromUser: (u: unknown) => u }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { signOut: async () => ({}) } }) }));
vi.mock('@/server/memberAiKeys', () => ({ loadMemberAiKeys: h.loadKeys }));
vi.mock('@/litpage/server/ai/providers/config.ts', () => ({ withMemberAiKeys: (_k: unknown, fn: () => unknown) => fn() }));
vi.mock('@/litpage/server/ai/models.ts', () => ({ warmModelLists: h.warm }));
vi.mock('@/server/errorKo', () => ({ koErrorBody: (_s: number, b: unknown) => b }));

const { NextRequest } = await import('next/server');
const { POST } = await import('@/app/api/rpc/[name]/route');
const { EXPECTED_ACCOUNT_HEADER, ACCOUNT_CHANGED_NAME, ACCOUNT_CHANGED_MESSAGE } = await import('@/lib/accountGuard');

function call(name: string, expected?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' };
  if (expected !== undefined) headers[EXPECTED_ACCOUNT_HEADER] = expected;
  const req = new NextRequest(`http://localhost/api/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify({ month: '2026-11' }) });
  return POST(req, { params: Promise.resolve({ name }) });
}
beforeEach(() => { h.sessionUser = 'uB'; for (const f of [h.runRpc, h.loadKeys, h.warm, h.afterRpc, h.after]) f.mockClear(); });

describe('rpc 기대 계정 검사', () => {
  it.each(['rcptState', 'rcptSaveEvidence', 'btIssue', 'btAmend'])('%s: 화면은 A를 기대하는데 세션이 B → 409 AccountChanged·no-store, 명령·AI 키·모델·후처리 0', async (name) => {
    const res = await call(name, 'uA');
    expect(res.status).toBe(409);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(await res.json()).toEqual({ name: ACCOUNT_CHANGED_NAME, message: ACCOUNT_CHANGED_MESSAGE });
    expect(h.runRpc).not.toHaveBeenCalled();
    expect(h.loadKeys).not.toHaveBeenCalled();
    expect(h.warm).not.toHaveBeenCalled();
    expect(h.after).not.toHaveBeenCalled();
    expect(h.afterRpc).not.toHaveBeenCalled();
  });

  it('기대 계정과 세션이 같으면 기존대로 실행', async () => {
    h.sessionUser = 'uA';
    const res = await call('rcptState', 'uA');
    expect(res.status).toBe(200);
    expect(h.runRpc).toHaveBeenCalledTimes(1);
  });

  it('회귀: 헤더 없는 기존 호출(워크스페이스 원본 화면·다른 단독 화면)은 그대로 실행', async () => {
    const res = await call('rcptState');
    expect(res.status).toBe(200);
    expect(h.runRpc).toHaveBeenCalledTimes(1);
  });
});
