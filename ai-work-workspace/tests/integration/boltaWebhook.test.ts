// 볼타 웹훅(2026-11-13) — 가짜 볼타 응답으로 확인(실제 호출 없음).
// 1. 서명(Standard Webhooks)이 맞을 때만 처리, 시각이 5분 넘게 어긋나면 거절.
// 2. 성공 알림 → 회원 본인 키로 승인번호를 조회해 문서를 「발급됨」으로, 실패 알림 → 한국어 사유와 함께 「실패」로.
// 3. 같은 알림 번호는 한 번만 처리, 다른 회원 주소로 온 알림은 그 문서를 건드리지 못한다.
import { createHmac } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';
import { boltaCauseText, verifyBoltaWebhook } from '@/server/boltaCore';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let rc: typeof import('../../src/server/receipts.ts');
let bt: typeof import('../../src/server/bolta.ts');
let wh: typeof import('../../src/server/boltaWebhook.ts');
let db: typeof import('../../src/litpage/server/db.ts');
const ctx = (userId: string) => ({ userId }) as never;
const ME = { name: '에이상회', ceo: '홍길동', bizNo: '220-81-62517', address: '서울시 중구', bizType: '도소매', bizItem: '문구', email: 'a@example.com', phone: '02-123-4567' };
const PARTNER = { name: '비상사', ceo: '김비', bizNo: '2208162517', address: '부산시', bizType: '서비스', bizItem: '컨설팅', email: 'b@example.com', phone: '' };
const SECRET = 'whsec_' + Buffer.from('webhook-secret-0123456789').toString('base64');
const NOW = Date.parse('2026-11-13T02:00:00Z');
const sign = (id: string, body: string, ts = Math.floor(NOW / 1000)) => ({
  id, timestamp: String(ts),
  signature: 'v1,' + createHmac('sha256', Buffer.from(SECRET.slice(6), 'base64')).update(`${id}.${ts}.${body}`).digest('base64'),
});
const docOf = (id: string) => JSON.parse((db.db.prepare('SELECT data FROM aww_rcpt_docs WHERE id = ?').get(id) as { data: string }).data);

let n = 0;
async function requested(user: string): Promise<{ id: string; key: string }> {
  rc.receiptHandlers.rcptSaveProfile(ctx(user), { profile: ME });
  const id = rc.receiptHandlers.rcptSaveDoc(ctx(user), { doc: { kind: 'tax_invoice', date: '2026-11-13', taxMode: 'separate', lines: [{ name: '볼펜', qty: 1, unitPrice: 1000 }], partner: PARTNER, purpose: '영수' } }).doc.id as string;
  const key = `IK-${++n}`;
  bt.setBoltaFetch((async (url: string) => {
    const path = String(url).replace('https://xapi.bolta.io', '');
    const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
    if (path === '/v1/taxInvoices/issue') return json({ issuanceKey: key });
    if (path.startsWith('/v1/taxInvoices/issue/status')) return json({ issuanceKey: key, message: '처리 중' });
    return json({ code: 'NOT_FOUND' }, 404);
  }) as unknown as typeof fetch);
  expect(await bt.boltaHandlers.btIssue(ctx(user), { id })).toMatchObject({ state: 'requested' });
  return { id, key };
}

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  rc = await import('../../src/server/receipts.ts');
  bt = await import('../../src/server/bolta.ts');
  wh = await import('../../src/server/boltaWebhook.ts');
  bt.setBoltaKeyReader(async () => 'test_abc');
  wh.setBoltaSecretReader(async (u) => (u === 'wh-nosecret' ? null : SECRET));
});

describe('볼타 웹훅', () => {
  it('서명 검사: 맞으면 통과, 내용·시각이 다르면 거절', () => {
    const body = '{"a":1}';
    expect(verifyBoltaWebhook(SECRET, sign('m1', body), body, NOW)).toBeNull();
    expect(verifyBoltaWebhook(SECRET, sign('m1', body), '{"a":2}', NOW)).toMatch(/서명/);
    expect(verifyBoltaWebhook(SECRET, sign('m1', body), body, NOW + 6 * 60_000)).toMatch(/시각/);
    expect(verifyBoltaWebhook(SECRET, { id: 'm1', timestamp: null, signature: null }, body, NOW)).toMatch(/헤더/);
    expect(boltaCauseText({ code: 'INVALID_CERTIFICATE' })).toContain('공동인증서');
    expect(boltaCauseText({ code: 'X1', message: '국세청 오류' })).toBe('국세청 오류 (볼타·국세청 코드 X1)');
  });

  it('웹훅 주소는 회원마다 따로이고, 새로 만들면 옛 주소는 못 쓴다', () => {
    const a = wh.boltaWebhookHandlers.btWebhookUrl(ctx('wh-a'), {}).url as string;
    const tokenA = a.split('/').pop()!;
    expect(a.startsWith(wh.BOLTA_WEBHOOK_BASE)).toBe(true);
    expect(wh.boltaWebhookOwner(tokenA)).toBe('wh-a');
    const a2 = (wh.boltaWebhookHandlers.btWebhookUrl(ctx('wh-a'), {}).url as string).split('/').pop()!;
    expect(wh.boltaWebhookOwner(tokenA)).toBeNull();
    expect(wh.boltaWebhookOwner(a2)).toBe('wh-a');
    expect(wh.boltaWebhookOwner('x'.repeat(32))).toBeNull();
  });

  it('성공 알림 → 승인번호를 조회해 발급됨으로, 같은 알림은 한 번만', async () => {
    const { id, key } = await requested('wh-a');
    bt.setBoltaFetch((async () => new Response(JSON.stringify({ issuanceKey: key, ntsTransactionId: 'NTS-W1' }), { status: 200 })) as unknown as typeof fetch);
    const body = JSON.stringify({ eventType: 'TAX_INVOICE_ISSUANCE_SUCCESS', data: { issuanceKey: key, taxInvoiceUrl: 'https://x' } });
    expect(await wh.handleBoltaWebhook('wh-a', { ...sign('m-ok', body), signature: 'v1,AAAA' }, body, NOW)).toMatchObject({ status: 400, result: expect.stringMatching(/^bad_signature/) });
    expect(docOf(id).bolta.state).toBe('requested');
    expect(await wh.handleBoltaWebhook('wh-a', sign('m-ok', body), body, NOW)).toEqual({ status: 200, result: 'issued' });
    expect(docOf(id).bolta).toMatchObject({ state: 'issued', ntsTransactionId: 'NTS-W1' });
    expect(await wh.handleBoltaWebhook('wh-a', sign('m-ok', body), body, NOW)).toEqual({ status: 200, result: 'duplicate' });
  });

  it('실패 알림 → 한국어 사유와 함께 실패로, 다른 회원 주소로는 못 바꾼다', async () => {
    const { id, key } = await requested('wh-b');
    const body = JSON.stringify({ eventType: 'TAX_INVOICE_ISSUANCE_FAILURE', data: { issuanceKey: key, cause: { code: 'INVALID_SUPPLIED_BUSINESS', message: 'x' } } });
    expect(await wh.handleBoltaWebhook('wh-a', sign('m-f1', body), body, NOW)).toEqual({ status: 200, result: 'unknown_doc' });
    expect(docOf(id).bolta.state).toBe('requested');
    expect(await wh.handleBoltaWebhook('wh-nosecret', sign('m-f2', body), body, NOW)).toEqual({ status: 400, result: 'no_secret' });
    expect(await wh.handleBoltaWebhook('wh-b', sign('m-f3', body), body, NOW)).toEqual({ status: 200, result: 'failed' });
    expect(docOf(id).bolta).toMatchObject({ state: 'failed' });
    expect(docOf(id).bolta.message).toContain('거래처 사업자등록번호');
    bt.setBoltaFetch(undefined);
  });
it('운영 확인에서 고침: 접수 번호에 「_」가 있어도 찾고, 접수 번호 저장 전에 온 알림은 409로 다시 받는다', async () => {
    // 접수 번호 저장 전(보내는 중) — 알림이 먼저 오면 처리 표시 없이 409
    rc.receiptHandlers.rcptSaveProfile(ctx('wh-c'), { profile: ME });
    const id = rc.receiptHandlers.rcptSaveDoc(ctx('wh-c'), { doc: { kind: 'tax_invoice', date: '2026-11-13', taxMode: 'separate', lines: [{ name: '볼펜', qty: 1, unitPrice: 1000 }], partner: PARTNER, purpose: '영수' } }).doc.id as string;
    const data = docOf(id);
    db.db.prepare('UPDATE aww_rcpt_docs SET data = ? WHERE id = ?').run(JSON.stringify({ ...data, bolta: { ref: 'aww-r1', mode: 'test', state: 'sending', time: NOW } }), id);
    const key = 'IK_with_underscore-1';
    const body = JSON.stringify({ eventType: 'TAX_INVOICE_ISSUANCE_SUCCESS', data: { issuanceKey: key } });
    expect(await wh.handleBoltaWebhook('wh-c', sign('m-early', body), body, NOW)).toEqual({ status: 409, result: 'unknown_doc_retry' });
    // 접수 번호가 저장된 뒤 같은 알림을 다시 받으면 처리된다(중복 표시가 남지 않았으므로)
    db.db.prepare('UPDATE aww_rcpt_docs SET data = ? WHERE id = ?').run(JSON.stringify({ ...data, bolta: { ref: 'aww-r1', mode: 'test', state: 'requested', issuanceKey: key, time: NOW } }), id);
    bt.setBoltaFetch((async () => new Response(JSON.stringify({ issuanceKey: key, ntsTransactionId: 'NTS-U1' }), { status: 200 })) as unknown as typeof fetch);
    expect(await wh.handleBoltaWebhook('wh-c', sign('m-early', body), body, NOW + 60_000)).toEqual({ status: 200, result: 'issued' });
    expect(docOf(id).bolta).toMatchObject({ state: 'issued', ntsTransactionId: 'NTS-U1' });
    bt.setBoltaFetch(undefined);
  });
});

