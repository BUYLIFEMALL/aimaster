// @vitest-environment jsdom
// 2026-11-17 WS-20261117-17 QA017 P2(Mac msg_014541b68abb) — 영수증 전용 boundReceiptRpc: 계정 id가 없으면(빈 값·null·undefined·공백) 요청 전에 실패(fail-closed).
// 실제 receiptRpc·standaloneRpc 모듈, fetch만 모의. 공용 rpc의 옵션 없는 기존 호출 동작은 바꾸지 않음.
import { afterEach, describe, expect, it, vi } from 'vitest';

const { boundReceiptRpc } = await import('@/app/receipts/receiptRpc');
const { AccountChangedError } = await import('@/lib/standaloneRpc');
const { EXPECTED_ACCOUNT_HEADER, ACCOUNT_CHANGED_NAME, ACCOUNT_CHANGED_MESSAGE } = await import('@/lib/accountGuard');

function stubFetch(status: number, body: unknown) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', f);
  return f;
}
afterEach(() => vi.unstubAllGlobals());

describe('boundReceiptRpc 계정 id 없음 → 요청 전 실패', () => {
  it.each([['빈 문자열', ''], ['null', null], ['undefined', undefined], ['공백', '   ']])('%s: fetch 0, 계정 바뀜 알림 1, AccountChangedError', async (_n, id) => {
    const f = stubFetch(200, { ok: 1 });
    const changed = vi.fn();
    const err = await boundReceiptRpc(id as string | null | undefined, changed)('rcptSaveEvidence', { evidence: {} }).catch((e) => e);
    expect(f).not.toHaveBeenCalled();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(err).toBeInstanceOf(AccountChangedError);
  });

  it('정상 id: 정확한 기대 계정 헤더로 한 번 요청, 알림 0', async () => {
    const f = stubFetch(200, { ok: 1 });
    const changed = vi.fn();
    await boundReceiptRpc('uA', changed)('rcptState', {});
    expect(f).toHaveBeenCalledTimes(1);
    expect(new Headers((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).get(EXPECTED_ACCOUNT_HEADER)).toBe('uA');
    expect(changed).not.toHaveBeenCalled();
  });

  it('회귀: 서버 409(계정 바뀜)면 알림 1·AccountChangedError', async () => {
    stubFetch(409, { name: ACCOUNT_CHANGED_NAME, message: ACCOUNT_CHANGED_MESSAGE });
    const changed = vi.fn();
    const err = await boundReceiptRpc('uA', changed)('btIssue', { id: 'd1' }).catch((e) => e);
    expect(err).toBeInstanceOf(AccountChangedError);
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
