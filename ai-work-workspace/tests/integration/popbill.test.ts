// 팝빌 세금계산서 발급(2026-11-13, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5) — 가짜 팝빌 응답으로 확인(실제 호출 없음).
// 1. 토큰 서명: 공식 linkhub 패키지 방식(본문 SHA-256 base64, 키 = SecretKey base64 풀기)과 같은 값.
// 2. 저장한 세금계산서 → 발급 데이터(정발행·과세·영수/청구, 품목), 못 보내는 이유는 한국어.
// 3. 회원 본인 키가 없으면 한국어 안내. 실제 발급 전환은 동의가 있어야 함.
// 4. 이중 발급 방지: 응답을 못 받으면 「보내는 중」으로 남고, 다시 누르면 먼저 조회해 이미 발급됐으면 다시 보내지 않음.
import { createHash, createHmac } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';
import { newMgtKey, popbillInvoice, tokenRequest } from '@/server/popbillCore';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let rc: typeof import('../../src/server/receipts.ts');
let pb: typeof import('../../src/server/popbill.ts');
let db: typeof import('../../src/litpage/server/db.ts');
const ctx = (userId: string) => ({ userId }) as never;
const ME = { name: '에이상회', ceo: '홍길동', bizNo: '220-81-62517', address: '서울시 중구', bizType: '도소매', bizItem: '문구', email: 'a@example.com', phone: '02-123-4567' };
const PARTNER = { name: '비상사', ceo: '김비', bizNo: '2208162517', address: '부산시', bizType: '서비스', bizItem: '컨설팅', email: 'b@example.com', phone: '' };
const SECRET = Buffer.from('test-secret-key-0123456789').toString('base64');

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  rc = await import('../../src/server/receipts.ts');
  pb = await import('../../src/server/popbill.ts');
  pb.setPopbillKeyReader(async (u) => (u === 'pb-nokey' ? { linkId: null, secretKey: null } : { linkId: 'MYLINK', secretKey: SECRET }));
});

describe('팝빌 — 순수 함수', () => {
  it('토큰 서명은 공식 linkhub 방식과 같다', () => {
    const t = tokenRequest({ linkId: 'MYLINK', secretKey: SECRET, mode: 'test', corpNum: '2208162517', date: '2026-11-13T00:00:00.000Z' });
    expect(t.url).toBe('https://auth.linkhub.co.kr/POPBILL_TEST/Token');
    expect(t.body).toBe('{"access_id":"2208162517","scope":["member","110"]}');
    const digest = createHash('sha256').update(t.body).digest('base64');
    const sig = createHmac('sha256', Buffer.from(SECRET, 'base64')).update(`POST\n${digest}\n2026-11-13T00:00:00.000Z\n2.0\n/POPBILL_TEST/Token`).digest('base64');
    expect(t.headers.Authorization).toBe(`LINKHUB MYLINK ${sig}`);
    expect(t.headers['x-lh-version']).toBe('2.0');
    expect(tokenRequest({ linkId: 'L', secretKey: SECRET, mode: 'prod', corpNum: '1' }).url).toBe('https://auth.linkhub.co.kr/POPBILL/Token');
  });

  it('문서번호는 24자 안의 영숫자', () => {
    const k = newMgtKey(Date.parse('2026-11-13T01:00:00Z'));
    expect(k).toMatch(/^AWW20261113[0-9A-F]{12}$/);
    expect(k.length).toBeLessThanOrEqual(24);
  });

  it('세금계산서 → 발급 데이터, 못 보내는 이유는 한국어', () => {
    const doc = { date: '2026-11-13', taxMode: 'separate' as const, lines: [{ name: '볼펜', spec: '', qty: 2, unitPrice: 5000, supply: 10000, tax: 1000 }], supply: 10000, tax: 1000, partner: PARTNER, purpose: '청구' };
    const { body } = popbillInvoice(ME, doc, 'AWW1');
    expect(body).toMatchObject({ issueType: '정발행', taxType: '과세', chargeDirection: '정과금', writeDate: '20261113', purposeType: '청구', supplyCostTotal: '10000', taxTotal: '1000', totalAmount: '11000', invoicerCorpNum: '2208162517', invoiceeCorpNum: '2208162517', invoiceeType: '사업자' });
    expect((body!.detailList as any[])[0]).toMatchObject({ serialNum: 1, itemName: '볼펜', qty: '2', unitCost: '5000', supplyCost: '10000', tax: '1000' });
    const bad = popbillInvoice(ME, { ...doc, taxMode: 'none', partner: { ...PARTNER, ceo: '' } }, 'AWW1');
    expect(bad.body).toBeNull();
    expect(bad.problems.join(' ')).toMatch(/전자계산서.*|대표자/);
  });
});

describe('팝빌 — 명령', () => {
  let docId = '';
  beforeAll(() => {
    rc.receiptHandlers.rcptSaveProfile(ctx('pb-a'), { profile: ME });
    docId = rc.receiptHandlers.rcptSaveDoc(ctx('pb-a'), { doc: { kind: 'tax_invoice', date: '2026-11-13', taxMode: 'separate', lines: [{ name: '볼펜', qty: 2, unitPrice: 5000 }], partner: PARTNER, purpose: '영수' } }).doc.id;
  });

  it('본인 키가 없으면 한국어 안내, 실제 발급 전환은 동의가 있어야 한다', async () => {
    rc.receiptHandlers.rcptSaveProfile(ctx('pb-nokey'), { profile: ME });
    await expect(pb.popbillHandlers.pbCertUrl(ctx('pb-nokey'), {})).rejects.toThrow(/LinkID·SecretKey를 먼저 등록/);
    expect(() => pb.popbillHandlers.pbSetMode(ctx('pb-a'), { mode: 'prod' })).toThrow(/동의/);
  });

  it('응답을 못 받으면 다시 보내지 않고, 다시 누르면 먼저 조회해 이미 발급된 것만 기록한다', async () => {
    const calls: string[] = [];
    let issueMode: 'drop' | 'ok' = 'drop';
    pb.setPopbillFetch((async (url: string, init?: RequestInit) => {
      const u = String(url);
      const m = `${init?.method ?? 'GET'} ${u.replace(/^https:\/\/[^/]+/, '')}${init?.headers && (init.headers as any)['X-HTTP-Method-Override'] ? ' ' + (init.headers as any)['X-HTTP-Method-Override'] : ''}`;
      calls.push(m);
      const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
      if (u.endsWith('/Token')) return json({ session_token: 'tok', expiration: '2026-11-13T00:30:00Z' });
      if (u.endsWith('/Taxinvoice') && (init?.headers as any)['X-HTTP-Method-Override'] === 'ISSUE') {
        if (issueMode === 'drop') throw new TypeError('network');
        return json({ code: 1, message: '발행 완료', ntsConfirmNum: 'NTS1' });
      }
      if (u.includes('/Taxinvoice/SELL/')) return json({ stateCode: 300, ntsconfirmNum: 'NTS-PREV' });
      return json({ code: 1 });
    }) as unknown as typeof fetch);

    await expect(pb.popbillHandlers.pbIssue(ctx('pb-a'), { id: docId })).rejects.toThrow(/자동으로 다시 보내지 않습니다/);
    const saved = JSON.parse((db.db.prepare('SELECT data FROM aww_rcpt_docs WHERE id = ?').get(docId) as { data: string }).data);
    expect(saved.popbill).toMatchObject({ state: 'sending', mode: 'test' });
    const firstKey = saved.popbill.mgtKey;

    issueMode = 'ok';
    calls.length = 0;
    const r = await pb.popbillHandlers.pbIssue(ctx('pb-a'), { id: docId });
    expect(r).toMatchObject({ state: 'issued', already: true, ntsConfirmNum: 'NTS-PREV' });
    expect(calls.some((c) => c.includes('ISSUE'))).toBe(false); // 다시 보내지 않음
    expect(calls).toContain(`GET /Taxinvoice/SELL/${firstKey}`);

    calls.length = 0;
    const again = await pb.popbillHandlers.pbIssue(ctx('pb-a'), { id: docId });
    expect(again).toMatchObject({ already: true });
    expect(calls).toHaveLength(0); // 이미 발급된 문서는 팝빌에 묻지도 않음
    pb.setPopbillFetch(undefined);
  });

  it('다른 회원의 문서는 발급할 수 없다', async () => {
    await expect(pb.popbillHandlers.pbIssue(ctx('pb-x'), { id: docId })).rejects.toThrow(/찾지 못했습니다/);
  });
});
