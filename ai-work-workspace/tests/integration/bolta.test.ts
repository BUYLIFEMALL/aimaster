// 볼타 세금계산서 발급(2026-11-13, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5) — 가짜 볼타 응답으로 확인(실제 호출 없음).
// 1. 인증 헤더(Basic, 키 + ":"), 키 앞부분으로 테스트/실제 구분.
// 2. 저장한 세금계산서 → 정발행 본문(영수/청구, 과세/면세, 품목), 못 보내는 이유는 한국어.
// 3. 키 없음·실제 키 동의 전 발급은 한국어로 막는다.
// 4. 이중 발급 방지: 응답을 못 받으면 「보내는 중」, 다시 누르면 같은 요청 번호로 접수 여부부터 조회하고 다시 보내지 않음 → 결과 확인으로 국세청 승인번호 기록.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';
import { boltaAuth, boltaInvoice, boltaModeOf, newClientRef } from '@/server/boltaCore';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let rc: typeof import('../../src/server/receipts.ts');
let bt: typeof import('../../src/server/bolta.ts');
let db: typeof import('../../src/litpage/server/db.ts');
const ctx = (userId: string) => ({ userId }) as never;
const ME = { name: '에이상회', ceo: '홍길동', bizNo: '220-81-62517', address: '서울시 중구', bizType: '도소매', bizItem: '문구', email: 'a@example.com', phone: '02-123-4567' };
const PARTNER = { name: '비상사', ceo: '김비', bizNo: '2208162517', address: '부산시', bizType: '서비스', bizItem: '컨설팅', email: 'b@example.com', phone: '' };
const KEYS: Record<string, string | null> = { 'bt-a': 'test_abc', 'bt-live': 'live_xyz', 'bt-nokey': null };

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  rc = await import('../../src/server/receipts.ts');
  bt = await import('../../src/server/bolta.ts');
  bt.setBoltaKeyReader(async (u) => KEYS[u] ?? null);
});

describe('볼타 — 순수 함수', () => {
  it('인증 헤더와 키 구분', () => {
    expect(boltaAuth('test_abc')).toBe(`Basic ${Buffer.from('test_abc:').toString('base64')}`);
    expect(boltaModeOf('test_1')).toBe('test');
    expect(boltaModeOf('live_1')).toBe('live');
    expect(boltaModeOf('abc')).toBeNull();
    expect(newClientRef(Date.parse('2026-11-13T01:00:00Z'))).toMatch(/^aww-20261113-[0-9a-f]{16}$/);
  });

  it('세금계산서 → 정발행 본문, 못 보내는 이유는 한국어', () => {
    const doc = { date: '2026-11-13', taxMode: 'separate' as const, lines: [{ name: '볼펜', spec: '', qty: 2, unitPrice: 5000, supply: 10000, tax: 1000 }], supply: 10000, tax: 1000, partner: PARTNER, purpose: '청구' };
    const { body } = boltaInvoice(ME, doc);
    expect(body).toMatchObject({ date: '2026-11-13', purpose: 'CLAIM', taxType: 'TAXABLE', supplier: { identificationNumber: '2208162517', manager: { email: 'a@example.com' } }, supplied: { identificationNumber: '2208162517', managers: [{ email: 'b@example.com' }] } });
    expect((body!.items as any[])[0]).toMatchObject({ date: '2026-11-13', name: '볼펜', quantity: 2, unitPrice: 5000, supplyCost: 10000, tax: 1000 });
    const free = boltaInvoice(ME, { ...doc, taxMode: 'none', purpose: '영수' }).body!;
    expect(free).toMatchObject({ taxType: 'TAX_FREE', purpose: 'RECEIPT' });
    expect((free.items as any[])[0].tax).toBeNull();
    const bad = boltaInvoice(ME, { ...doc, partner: { ...PARTNER, email: '' } });
    expect(bad.body).toBeNull();
    expect(bad.problems.join(' ')).toContain('거래처 이메일');
  });
});

describe('볼타 — 명령', () => {
  const save = (u: string) => {
    rc.receiptHandlers.rcptSaveProfile(ctx(u), { profile: ME });
    return rc.receiptHandlers.rcptSaveDoc(ctx(u), { doc: { kind: 'tax_invoice', date: '2026-11-13', taxMode: 'separate', lines: [{ name: '볼펜', qty: 2, unitPrice: 5000 }], partner: PARTNER, purpose: '영수' } }).doc.id as string;
  };

  it('키가 없거나 실제 키 동의 전이면 한국어로 막는다', async () => {
    const a = save('bt-nokey');
    await expect(bt.boltaHandlers.btIssue(ctx('bt-nokey'), { id: a })).rejects.toThrow(/볼타 API 키를 먼저 등록/);
    const b = save('bt-live');
    await expect(bt.boltaHandlers.btIssue(ctx('bt-live'), { id: b })).rejects.toThrow(/실제 발급 동의/);
    expect(() => bt.boltaHandlers.btAgreeLive(ctx('bt-live'), {})).toThrow(/동의/);
  });

  it('응답을 못 받으면 다시 보내지 않고, 접수 여부부터 조회한 뒤 결과를 기록한다', async () => {
    const id = save('bt-a');
    const calls: string[] = [];
    let issueMode: 'drop' | 'ok' = 'drop';
    let ready = false;
    bt.setBoltaFetch((async (url: string, init?: RequestInit) => {
      const path = String(url).replace('https://xapi.bolta.io', '');
      calls.push(`${init?.method} ${path}`);
      expect((init?.headers as any).Authorization).toBe(boltaAuth('test_abc'));
      const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
      if (path === '/v1/taxInvoices/issue') {
        expect((init?.headers as any)['Bolta-Client-Reference-Id']).toMatch(/^aww-/);
        if (issueMode === 'drop') throw new TypeError('network');
        return json({ issuanceKey: 'IK-NEW' });
      }
      if (path.startsWith('/v1/taxInvoices/issue/status')) return json({ issuanceKey: 'IK-1', clientReferenceId: 'x', message: '접수' });
      if (path === '/v1/taxInvoices/IK-1') return ready ? json({ issuanceKey: 'IK-1', ntsTransactionId: 'NTS-1', issuedAt: '2026-11-13T01:00:00Z', invoice: {} }) : json({ code: 'NOT_FOUND', message: '없음' }, 404);
      return json({});
    }) as unknown as typeof fetch);

    await expect(bt.boltaHandlers.btIssue(ctx('bt-a'), { id })).rejects.toThrow(/자동으로 다시 보내지 않습니다/);
    const saved = JSON.parse((db.db.prepare('SELECT data FROM aww_rcpt_docs WHERE id = ?').get(id) as { data: string }).data);
    expect(saved.bolta).toMatchObject({ state: 'sending', mode: 'test' });

    issueMode = 'ok';
    calls.length = 0;
    const r1 = await bt.boltaHandlers.btIssue(ctx('bt-a'), { id });
    expect(r1).toMatchObject({ state: 'requested' });
    expect(calls.some((c) => c === 'POST /v1/taxInvoices/issue')).toBe(false); // 이미 접수된 요청은 다시 보내지 않음
    expect(calls[0]).toBe(`GET /v1/taxInvoices/issue/status?clientReferenceId=${encodeURIComponent(saved.bolta.ref)}`);

    ready = true;
    const r2 = await bt.boltaHandlers.btIssue(ctx('bt-a'), { id });
    expect(r2).toMatchObject({ state: 'issued', ntsTransactionId: 'NTS-1' });
    calls.length = 0;
    expect(await bt.boltaHandlers.btIssue(ctx('bt-a'), { id })).toMatchObject({ already: true });
    expect(calls).toHaveLength(0);
    bt.setBoltaFetch(undefined);
  });

  it('다른 회원의 문서는 발급할 수 없다', async () => {
    const id = save('bt-a');
    await expect(bt.boltaHandlers.btIssue(ctx('bt-x'), { id })).rejects.toThrow(/찾지 못했습니다/);
  });
});
