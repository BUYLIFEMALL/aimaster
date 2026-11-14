// 볼타 수정발행·PDF(2026-11-15, 플랜 docs/PLAN_20261115_BOLTA_AMEND.md) — 가짜 볼타 응답으로 확인(실제 호출 없음).
// 1. 사유별 본문: 계약의 해제(date만)·이중발급(본문 없음)·공급가액 변동(차이 품목 + taxType)·환입(음수, taxType 없음)·착오정정(정발행 형식, description 없음).
// 2. 볼타로 발급을 마친 문서만, 같은 종류 키로만, 실제 키는 동의 뒤에만, 결과를 기다리는 수정발행이 있으면 새로 못 보냄.
// 3. 이중 발급 방지: 응답을 못 받으면 「보내는 중」 → 결과 확인 때 같은 요청 번호로 접수 여부부터 조회, 기록이 없을 때만 같은 번호·같은 본문으로 다시 보냄.
// 4. 착오정정 두 장(수정분·취소분)이 모두 발행돼야 「발급됨」. 5. PDF는 이 문서의 발행 번호만.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';
import { boltaAmendBody } from '@/server/boltaCore';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let rc: typeof import('../../src/server/receipts.ts');
let bt: typeof import('../../src/server/bolta.ts');
let db: typeof import('../../src/litpage/server/db.ts');
const ctx = (userId: string) => ({ userId }) as never;
const ME = { name: '에이상회', ceo: '홍길동', bizNo: '220-81-62517', address: '서울시 중구', bizType: '도소매', bizItem: '문구', email: 'a@example.com', phone: '02-123-4567' };
const PARTNER = { name: '비상사', ceo: '김비', bizNo: '2208162517', address: '부산시', bizType: '서비스', bizItem: '컨설팅', email: 'b@example.com', phone: '' };
const KEYS: Record<string, string | null> = { 'am-a': 'test_abc', 'am-b': 'test_abc', 'am-live': 'live_xyz' };
const NOW = Date.parse('2026-11-15T03:00:00Z');
const ORIG = {
  date: '2026-11-13', taxMode: 'separate' as const, purpose: '영수', memo: '비고',
  lines: [{ name: '볼펜', spec: '', qty: 10, unitPrice: 5000, supply: 50000, tax: 5000 }], supply: 50000, tax: 5000, partner: PARTNER,
};

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  rc = await import('../../src/server/receipts.ts');
  bt = await import('../../src/server/bolta.ts');
  bt.setBoltaKeyReader(async (u) => KEYS[u] ?? null);
});

describe('수정발행 — 본문 만들기', () => {
  it('계약의 해제는 작성일자만, 금액은 원본 전체를 마이너스로', () => {
    const r = boltaAmendBody('termination', ORIG, { date: '2026-11-15' }, ME, NOW);
    expect(r.body).toEqual({ date: '2026-11-15' });
    expect(r.amount).toBe(-55000);
    expect(boltaAmendBody('termination', ORIG, {}, ME, NOW).problems.join(' ')).toContain('계약 해제일');
    expect(boltaAmendBody('termination', ORIG, { date: '2026-11-20' }, ME, NOW).problems.join(' ')).toContain('오늘이나 이전');
  });

  it('이중발급은 본문 없음', () => {
    const r = boltaAmendBody('doubleIssuance', ORIG, {}, ME, NOW);
    expect(r).toMatchObject({ body: null, amount: -55000, problems: [] });
  });

  it('공급가액 변동은 차이 품목 + 과세유형, 세액 기본값은 10% 내림(마이너스는 절댓값 내림)', () => {
    const r = boltaAmendBody('changeSupplyCost', ORIG, { date: '2026-11-15', lines: [{ name: '볼펜 단가 조정', qty: 10, unitPrice: -1000, supply: -10005 }] }, ME, NOW);
    expect(r.body).toMatchObject({ date: '2026-11-15', taxType: 'TAXABLE' });
    expect((r.body!.items as any[])[0]).toMatchObject({ date: '2026-11-15', name: '볼펜 단가 조정', quantity: 10, unitPrice: -1000, supplyCost: -10005, tax: -1000 });
    expect(r.amount).toBe(-11005);
    const free = boltaAmendBody('changeSupplyCost', { ...ORIG, taxMode: 'none' }, { date: '2026-11-15', lines: [{ name: '추가', supply: 3000 }] }, ME, NOW);
    expect(free.body).toMatchObject({ taxType: 'TAX_FREE' });
    expect((free.body!.items as any[])[0].tax).toBeNull();
    expect(boltaAmendBody('changeSupplyCost', ORIG, { date: '2026-11-15', lines: [] }, ME, NOW).problems.join(' ')).toContain('품목을 1줄 이상');
  });

  it('환입은 음수 합계만, 과세유형을 보내지 않음', () => {
    const r = boltaAmendBody('return', ORIG, { date: '2026-11-15', lines: [{ name: '볼펜 반품', qty: 4, unitPrice: -5000, supply: -20000, tax: -2000 }] }, ME, NOW);
    expect(r.body).toMatchObject({ date: '2026-11-15' });
    expect(r.body).not.toHaveProperty('taxType');
    expect(r.amount).toBe(-22000);
    expect(boltaAmendBody('return', ORIG, { date: '2026-11-15', lines: [{ name: '반품', supply: 20000 }] }, ME, NOW).problems.join(' ')).toContain('마이너스');
  });

  it('착오정정은 고친 내용을 정발행 형식으로(비고 빼고), 금액은 다시 계산', () => {
    const r = boltaAmendBody('misspell', ORIG, { doc: { lines: [{ name: '볼펜', spec: '', qty: 11, unitPrice: 5000, supply: 0, tax: 0 }], partner: { ...PARTNER, name: '비상사(정정)' } } }, ME, NOW);
    expect(r.problems).toEqual([]);
    expect(r.body).toMatchObject({ date: '2026-11-13', taxType: 'TAXABLE', supplied: { organizationName: '비상사(정정)' } });
    expect(r.body).not.toHaveProperty('description');
    expect((r.body!.items as any[])[0]).toMatchObject({ supplyCost: 55000, tax: 5500 });
    expect(r.amount).toBe(60500 - 55000);
    expect(boltaAmendBody('misspell', ORIG, { doc: { taxMode: 'none' } }, ME, NOW).problems.join(' ')).toContain('과세와 면세');
  });
});

describe('수정발행 — 명령', () => {
  const issued = (u: string, mode: 'test' | 'live' = 'test') => {
    rc.receiptHandlers.rcptSaveProfile(ctx(u), { profile: ME });
    const id = rc.receiptHandlers.rcptSaveDoc(ctx(u), { doc: { kind: 'tax_invoice', date: '2026-11-13', taxMode: 'separate', lines: [{ name: '볼펜', qty: 10, unitPrice: 5000 }], partner: PARTNER, purpose: '영수' } }).doc.id as string;
    const row = db.db.prepare('SELECT data FROM aww_rcpt_docs WHERE id = ?').get(id) as { data: string };
    const data = { ...JSON.parse(row.data), bolta: { ref: 'aww-x', mode, state: 'issued', issuanceKey: 'IK-ORIG', ntsTransactionId: 'NTS-ORIG', time: 1 } };
    db.db.prepare('UPDATE aww_rcpt_docs SET data = ? WHERE id = ?').run(JSON.stringify(data), id);
    return id;
  };
  const amends = (id: string) => JSON.parse((db.db.prepare('SELECT data FROM aww_rcpt_docs WHERE id = ?').get(id) as { data: string }).data).boltaAmends as any[];
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

  it('발급 전 문서·사유 없음·다른 키 종류·실제 키 동의 전은 한국어로 막는다', async () => {
    rc.receiptHandlers.rcptSaveProfile(ctx('am-a'), { profile: ME });
    const plain = rc.receiptHandlers.rcptSaveDoc(ctx('am-a'), { doc: { kind: 'tax_invoice', date: '2026-11-13', taxMode: 'separate', lines: [{ name: '볼펜', qty: 1, unitPrice: 1000 }], partner: PARTNER } }).doc.id as string;
    await expect(bt.boltaHandlers.btAmend(ctx('am-a'), { id: plain, reason: 'doubleIssuance' })).rejects.toThrow(/발급을 마친 세금계산서만/);
    const id = issued('am-a');
    await expect(bt.boltaHandlers.btAmend(ctx('am-a'), { id, reason: 'xx' })).rejects.toThrow(/수정 사유/);
    const liveDoc = issued('am-a', 'live');
    await expect(bt.boltaHandlers.btAmend(ctx('am-a'), { id: liveDoc, reason: 'doubleIssuance' })).rejects.toThrow(/같은 종류의 키/);
    const l = issued('am-live', 'live');
    await expect(bt.boltaHandlers.btAmend(ctx('am-live'), { id: l, reason: 'doubleIssuance' })).rejects.toThrow(/실제 발급 동의/);
    await expect(bt.boltaHandlers.btAmend(ctx('am-x'), { id, reason: 'doubleIssuance' })).rejects.toThrow(/찾지 못했습니다/);
  });

  it('응답을 못 받으면 다시 보내지 않고, 결과 확인 때 접수 기록이 없으면 같은 번호·같은 본문으로 보낸 뒤 승인번호를 기록', async () => {
    const id = issued('am-a');
    const calls: { m: string; path: string; ref?: string; body?: string }[] = [];
    let mode: 'drop' | 'ok' = 'drop';
    let statusKnown = false;
    bt.setBoltaFetch((async (url: string, init?: RequestInit) => {
      const path = String(url).replace('https://xapi.bolta.io', '');
      calls.push({ m: String(init?.method), path, ref: (init?.headers as any)['Bolta-Client-Reference-Id'], body: init?.body as string | undefined });
      if (path === '/v1/taxInvoices/IK-ORIG/amend/termination') {
        if (mode === 'drop') throw new TypeError('network');
        return json({ issuanceKey: 'IK-AM1' });
      }
      if (path.startsWith('/v1/taxInvoices/issue/status')) return statusKnown ? json({ issuanceKey: 'IK-AM1', message: '접수' }) : json({ code: 'NOT_FOUND', message: '없음' }, 400);
      if (path === '/v1/taxInvoices/IK-AM1') return json({ issuanceKey: 'IK-AM1', ntsTransactionId: 'NTS-AM1' });
      return json({});
    }) as unknown as typeof fetch);

    await expect(bt.boltaHandlers.btAmend(ctx('am-a'), { id, reason: 'termination', date: '2026-11-14' })).rejects.toThrow(/자동으로 다시 보내지 않습니다/);
    const a0 = amends(id)[0];
    expect(a0).toMatchObject({ state: 'sending', reason: 'termination', amount: -55000, body: { date: '2026-11-14' } });
    // 결과를 기다리는 동안 새 수정발행은 막힘
    await expect(bt.boltaHandlers.btAmend(ctx('am-a'), { id, reason: 'doubleIssuance' })).rejects.toThrow(/결과를 기다리는 수정발행/);

    mode = 'ok';
    calls.length = 0;
    const r = await bt.boltaHandlers.btAmendCheck(ctx('am-a'), { id });
    expect(calls[0]).toMatchObject({ m: 'GET', path: `/v1/taxInvoices/issue/status?clientReferenceId=${encodeURIComponent(a0.ref)}` });
    const resend = calls.find((c) => c.m === 'POST');
    expect(resend).toMatchObject({ path: '/v1/taxInvoices/IK-ORIG/amend/termination', ref: a0.ref });
    expect(JSON.parse(resend!.body!)).toEqual({ date: '2026-11-14' });
    expect(r).toMatchObject({ state: 'issued', ntsTransactionId: 'NTS-AM1' });
    expect(amends(id)[0]).toMatchObject({ state: 'issued', issuanceKey: 'IK-AM1', ntsTransactionId: 'NTS-AM1' });

    // 이미 접수된 건은 다시 보내지 않음(같은 문서의 다음 수정발행: 이중발급, 본문 없이)
    statusKnown = true;
    calls.length = 0;
    bt.setBoltaFetch((async (url: string, init?: RequestInit) => {
      const path = String(url).replace('https://xapi.bolta.io', '');
      calls.push({ m: String(init?.method), path, body: init?.body as string | undefined });
      if (path === '/v1/taxInvoices/IK-ORIG/amend/doubleIssuance') return json({ issuanceKey: 'IK-AM2' });
      if (path === '/v1/taxInvoices/IK-AM2') return json({ code: 'NOT_FOUND' }, 404);
      if (path.startsWith('/v1/taxInvoices/issue/status')) return json({ issuanceKey: 'IK-AM2', message: '국세청 전송 중' });
      return json({});
    }) as unknown as typeof fetch);
    const r2 = await bt.boltaHandlers.btAmend(ctx('am-a'), { id, reason: 'doubleIssuance' });
    expect(calls.find((c) => c.m === 'POST')!.body).toBeUndefined();
    expect(r2).toMatchObject({ state: 'requested', amount: -55000 });
    expect(amends(id)).toHaveLength(2);
    bt.setBoltaFetch(undefined);
  });

  it('착오정정은 수정분·취소분 두 장이 모두 발행돼야 「발급됨」', async () => {
    const id = issued('am-b');
    let cancelReady = false;
    bt.setBoltaFetch((async (url: string) => {
      const path = String(url).replace('https://xapi.bolta.io', '');
      if (path === '/v1/taxInvoices/IK-ORIG/amend/misspell') return json({ issuanceKey: 'IK-FIX', cancelIssuanceKey: 'IK-CAN' });
      if (path === '/v1/taxInvoices/IK-FIX') return json({ ntsTransactionId: 'NTS-FIX' });
      if (path === '/v1/taxInvoices/IK-CAN') return cancelReady ? json({ ntsTransactionId: 'NTS-CAN' }) : json({ code: 'NOT_FOUND' }, 404);
      if (path.startsWith('/v1/taxInvoices/issue/status')) return json({ message: '처리 중' });
      return json({});
    }) as unknown as typeof fetch);
    const r1 = await bt.boltaHandlers.btAmend(ctx('am-b'), { id, reason: 'misspell', doc: { partner: { ...PARTNER, name: '비상사(정정)' } } });
    expect(r1).toMatchObject({ state: 'requested', ntsTransactionId: 'NTS-FIX', cancelNts: null });
    expect(r1.message).toContain('취소분');
    cancelReady = true;
    const r2 = await bt.boltaHandlers.btAmendCheck(ctx('am-b'), { id });
    expect(r2).toMatchObject({ state: 'issued', ntsTransactionId: 'NTS-FIX', cancelNts: 'NTS-CAN' });
    expect(amends(id)[0]).toMatchObject({ cancel: { issuanceKey: 'IK-CAN', state: 'issued' } });

    // PDF: 이 문서의 발행 번호만, 준비 중이면 pending
    let pdfReady = false;
    bt.setBoltaFetch((async (url: string) => {
      const path = String(url).replace('https://xapi.bolta.io', '');
      if (path === '/v1/taxInvoices/IK-CAN/pdf') return pdfReady ? json({ issuanceKey: 'IK-CAN', status: 'READY', downloadUrl: 'https://pdf.example/x.pdf', filename: '취소분.pdf' }) : new Response('', { status: 202, headers: { 'Retry-After': '2' } });
      return json({});
    }) as unknown as typeof fetch);
    expect(await bt.boltaHandlers.btPdf(ctx('am-b'), { id, issuanceKey: 'IK-CAN' })).toMatchObject({ ready: false });
    pdfReady = true;
    expect(await bt.boltaHandlers.btPdf(ctx('am-b'), { id, issuanceKey: 'IK-CAN' })).toMatchObject({ ready: true, url: 'https://pdf.example/x.pdf' });
    await expect(bt.boltaHandlers.btPdf(ctx('am-b'), { id, issuanceKey: 'IK-OTHER' })).rejects.toThrow(/발급을 마친 세금계산서만/);
    bt.setBoltaFetch(undefined);
  });
});
