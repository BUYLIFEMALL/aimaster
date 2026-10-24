// U3: 회원 본인 AI 키만 읽는지(최상위 규칙) — 공용 DB 대신 가짜 Supabase 클라이언트로 확인한다.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ROWS = [
  { user_id: 'alice', provider: 'anthropic', api_key: 'sk-ant-alice-own-key-0000000000' },
  { user_id: 'alice', provider: 'gemini', api_key: 'AIza-alice-gemini' },
  { user_id: 'bob', provider: 'openai', api_key: 'sk-bob-own-key-000000000000000' },
];
const queries: { user: string; providers: string[] }[] = [];

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      expect(table).toBe('user_api_keys');
      const q = { user: '', providers: [] as string[] };
      const chain = {
        select: () => chain,
        eq: (col: string, v: string) => { if (col === 'user_id') q.user = v; return chain; },
        in: (col: string, v: string[]) => {
          q.providers = v;
          queries.push(q);
          return Promise.resolve({ data: ROWS.filter((r) => r.user_id === q.user && v.includes(r.provider)), error: null });
        },
      };
      return chain;
    },
  }),
}));

const mod = await import('@/server/memberAiKeys');

describe('회원 본인 AI 키 읽기(U3)', () => {
  beforeEach(() => {
    queries.length = 0;
    mod.forgetMemberAiKeys('alice');
    mod.forgetMemberAiKeys('bob');
    mod.forgetMemberAiKeys('carol');
  });

  it('요청한 회원의 OpenAI·Claude 줄만 읽고 Claude를 우선한다', async () => {
    const k = await mod.loadMemberAiKeys('alice');
    expect(k).toEqual({ anthropicKey: 'sk-ant-alice-own-key-0000000000', provider: 'anthropic' });
    expect(queries).toEqual([{ user: 'alice', providers: ['anthropic', 'openai'] }]);
  });

  it('다른 회원의 키를 대신 쓰지 않는다(키 없는 회원은 빈 값)', async () => {
    const k = await mod.loadMemberAiKeys('carol');
    expect(k).toEqual({});
    expect(mod.hasMemberAiKey(k)).toBe(false);
  });

  it('회원별 캐시가 섞이지 않고, 지우면 다시 읽는다', async () => {
    await mod.loadMemberAiKeys('alice');
    const bob = await mod.loadMemberAiKeys('bob');
    expect(bob).toEqual({ openaiKey: 'sk-bob-own-key-000000000000000', provider: 'openai' });
    await mod.loadMemberAiKeys('alice');
    expect(queries.map((q) => q.user)).toEqual(['alice', 'bob']);
    mod.forgetMemberAiKeys('alice');
    await mod.loadMemberAiKeys('alice');
    expect(queries.map((q) => q.user)).toEqual(['alice', 'bob', 'alice']);
  });
});
