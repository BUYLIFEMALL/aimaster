// @vitest-environment jsdom
// 2026-11-17 WS-20261117-17 QA017 — 단독 화면 rpc의 선택 옵션 expectedAccount: 헤더 전달, 409를 계정 바뀜 오류로, 옵션 없는 기존 호출은 헤더 없음.
import { afterEach, describe, expect, it, vi } from 'vitest';

const { rpc, AccountChangedError } = await import('@/lib/standaloneRpc');
const { EXPECTED_ACCOUNT_HEADER, ACCOUNT_CHANGED_NAME, ACCOUNT_CHANGED_MESSAGE } = await import('@/lib/accountGuard');

function stubFetch(status: number, body: unknown) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', f);
  return f;
}
const headersOf = (f: ReturnType<typeof stubFetch>) => new Headers((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers);
afterEach(() => vi.unstubAllGlobals());

describe('단독 화면 rpc 기대 계정', () => {
  it('expectedAccount를 주면 헤더로 보냄', async () => {
    const f = stubFetch(200, { ok: 1 });
    await rpc('rcptState', {}, { expectedAccount: 'uA' });
    expect(headersOf(f).get(EXPECTED_ACCOUNT_HEADER)).toBe('uA');
  });
  it('회귀: 옵션 없는 기존 호출은 헤더 없음', async () => {
    const f = stubFetch(200, { ok: 1 });
    await rpc('rcptState', {});
    expect(headersOf(f).has(EXPECTED_ACCOUNT_HEADER)).toBe(false);
  });
  it('409 AccountChanged → AccountChangedError(고정 문구)', async () => {
    stubFetch(409, { name: ACCOUNT_CHANGED_NAME, message: ACCOUNT_CHANGED_MESSAGE });
    const err = await rpc('rcptState', {}, { expectedAccount: 'uA' }).catch((e) => e);
    expect(err).toBeInstanceOf(AccountChangedError);
    expect(err.message).toBe(ACCOUNT_CHANGED_MESSAGE);
  });
});
