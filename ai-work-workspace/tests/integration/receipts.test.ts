// 영수증·세금계산서(2026-11-11) — 플랜 docs/PLAN_20261027_RECEIPT_TAX_INVOICE.md §6-6 시험. 로컬 Docker Postgres(aww-pg-test)만 쓴다.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';
import * as core from '@/server/receiptsCore';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

// 회원 키: 시험용(member-nokey는 키 없음)
vi.mock('@/server/memberAiKeys', () => ({
  loadMemberAiKeys: async (userId: string) => (userId === 'member-nokey' ? {} : { anthropicKey: `key-of-${userId}`, provider: 'anthropic' }),
  hasMemberAiKey: () => true,
  forgetMemberAiKeys: () => {},
}));

let rc: typeof import('../../src/server/receipts.ts');
const ctx = (userId: string) => ({ userId }) as never;
const PHOTO = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg').toString('base64');

beforeAll(async () => {
  rc = await import('../../src/server/receipts.ts');
});

describe('계산·정리 함수', () => {
  it('사업자등록번호 형식·검증', () => {
    expect(core.formatBizNo('1234567890')).toBe('123-45-67890');
    expect(core.isValidBizNo('220-81-62517')).toBe(true);
    expect(core.isValidBizNo('220-81-62518')).toBe(false);
  });
  it('부가세 별도·포함·없음 계산', () => {
    expect(core.calcLine(3, 10_000, 'separate')).toEqual({ supply: 30_000, tax: 3_000 });
    expect(core.calcLine(1, 11_000, 'included')).toEqual({ supply: 10_000, tax: 1_000 });
    expect(core.calcLine(2, 5_000, 'none')).toEqual({ supply: 10_000, tax: 0 });
  });
  it('AI가 읽은 값 정리 — 합계만 있으면 부가세 포함으로 나누고, 날짜·금액 글자를 다듬는다', () => {
    const e = core.normalizeEvidence({ kind: '현금영수증', date: '2026년 11월 3일', vendor: ' 스타커피 ', bizNo: '1234567890', total: '11,000원' });
    expect(e).toMatchObject({ kind: 'cash_receipt', date: '2026-11-03', vendor: '스타커피', bizNo: '123-45-67890', supply: 10_000, vat: 1_000, total: 11_000 });
    expect(core.normalizeEvidence({ kind: 'tax_invoice', supply: 50_000, vat: 5_000 }).total).toBe(55_000);
  });
  it('모델 응답에서 JSON을 꺼낸다(코드 블록·앞뒤 글 포함)', () => {
    expect(core.parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(core.parseJsonLoose('결과: {"b":"x"} 끝')).toEqual({ b: 'x' });
    expect(core.parseJsonLoose('읽지 못함')).toBeNull();
  });
  it('장부 CSV는 BOM·한국어 머리글·쉼표 든 칸 따옴표', () => {
    const csv = core.evidenceCsv([{ id: '1', kind: 'card', date: '2026-11-01', vendor: '가게, 본점', bizNo: '', supply: 1000, vat: 100, total: 1100, payment: '카드', memo: '' }]);
    expect(csv.startsWith('﻿날짜,종류,거래처')).toBe(true);
    expect(csv).toContain('2026-11-01,카드전표,"가게, 본점",,1000,100,1100,카드,');
  });
});

describe('명령 — 회원 격리·저장', () => {
  it('내 사업자·거래처·품목 저장, 다른 회원에게는 보이지 않는다', async () => {
    const h = rc.receiptHandlers;
    h.rcptSaveProfile(ctx('member-a'), { profile: { name: '에이상회', bizNo: '1234567890' } });
    const p = h.rcptSavePartner(ctx('member-a'), { partner: { name: '거래처1', bizNo: '2208162517' } });
    h.rcptSaveItem(ctx('member-a'), { item: { name: '컨설팅', unitPrice: 100000 } });
    const a = await h.rcptState(ctx('member-a'), {});
    expect(a.profile.bizNo).toBe('123-45-67890');
    expect(a.partners.map((x: { name: string }) => x.name)).toEqual(['거래처1']);
    expect(a.items[0].unitPrice).toBe(100000);
    const b = await h.rcptState(ctx('member-b'), {});
    expect(b.profile).toBeNull();
    expect(b.partners).toEqual([]);
    // 다른 회원의 거래처는 고치거나 지울 수 없다
    expect(() => h.rcptSavePartner(ctx('member-b'), { partner: { id: p.partner.id, name: '가로채기' } })).toThrow();
    expect(() => h.rcptDeletePartner(ctx('member-b'), { id: p.partner.id })).toThrow();
  });
  it('문서 저장 때 금액은 서버가 다시 계산한다', () => {
    const r = rc.receiptHandlers.rcptSaveDoc(ctx('member-a'), { doc: { kind: 'statement', date: '2026-11-10', taxMode: 'separate', lines: [{ name: 'A', qty: 2, unitPrice: 15000, supply: 1, tax: 1 }], partner: { name: '거래처1' } } });
    expect(r.doc).toMatchObject({ supply: 30000, tax: 3000, total: 33000, kind: 'statement' });
    expect(() => rc.receiptHandlers.rcptSaveDoc(ctx('member-a'), { doc: { kind: 'statement', lines: [] } })).toThrow();
  });
  it('증빙 장부: 저장·월별 조회·합계·CSV, 다른 회원 장부와 섞이지 않음', async () => {
    const h = rc.receiptHandlers;
    h.rcptSaveEvidence(ctx('member-a'), { evidence: { kind: 'card', date: '2026-11-05', vendor: '문구점', supply: 9091, vat: 909, total: 10000 } });
    h.rcptSaveEvidence(ctx('member-a'), { evidence: { kind: 'receipt', date: '2026-10-30', vendor: '지난달', total: 5000 } });
    h.rcptSaveEvidence(ctx('member-b'), { evidence: { kind: 'card', date: '2026-11-06', vendor: '남의 가게', total: 99999 } });
    const nov = await h.rcptState(ctx('member-a'), { month: '2026-11' });
    expect(nov.evidence.map((e: { vendor: string }) => e.vendor)).toEqual(['문구점']);
    expect(nov.summary).toMatchObject({ count: 1, total: 10000 });
    const csv = h.rcptEvidenceCsv(ctx('member-a'), { month: '2026-11' });
    expect(csv.csv).toContain('문구점');
    expect(csv.csv).not.toContain('남의 가게');
  });
});

describe('사진 읽기', () => {
  it('회원 본인 키로 읽고 결과를 정리해 돌려준다(저장하지 않음)', async () => {
    const seen: string[] = [];
    rc.setVisionCaller(async ({ provider, key, model }) => {
      seen.push(`${provider}:${key}:${model}`);
      return '```json\n{"kind":"tax_invoice","date":"2026-11-02","vendor":"공급사","bizNo":"2208162517","supply":"100,000","vat":"10,000","total":"110,000"}\n```';
    });
    const r = await rc.receiptHandlers.rcptReadPhoto(ctx('member-a'), { image: PHOTO, mode: 'evidence' });
    expect(seen).toEqual(['anthropic:key-of-member-a:claude-sonnet-5-5']);
    expect(r.evidence).toMatchObject({ kind: 'tax_invoice', bizNo: '220-81-62517', supply: 100000, vat: 10000, total: 110000 });
    const st = await rc.receiptHandlers.rcptState(ctx('member-a'), { month: '2026-11' });
    expect(st.evidence.some((e: { vendor: string }) => e.vendor === '공급사')).toBe(false);
  });
  it('2026-11-13 PDF 증빙도 그대로 AI에 넘겨 읽는다(4MB 넘으면 거절)', async () => {
    const seen: string[] = [];
    rc.setVisionCaller(async ({ mime }) => {
      seen.push(mime);
      return '{"kind":"receipt","date":"2026-11-12","vendor":"PDF상점","supply":10000,"vat":1000,"total":11000}';
    });
    const pdf = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4 fake').toString('base64');
    const r = await rc.receiptHandlers.rcptReadPhoto(ctx('member-a'), { image: pdf, mode: 'evidence' });
    expect(seen).toEqual(['application/pdf']);
    expect(r.evidence).toMatchObject({ vendor: 'PDF상점', total: 11000 });
    const big = 'data:application/pdf;base64,' + 'A'.repeat(6 * 1024 * 1024);
    await expect(rc.receiptHandlers.rcptReadPhoto(ctx('member-a'), { image: big, mode: 'evidence' })).rejects.toThrow(/PDF가 너무 큽니다/);
  });
  it('키가 없으면 다른 키로 대신하지 않고 등록 안내', async () => {
    rc.setVisionCaller(async () => { throw new Error('부르면 안 됨'); });
    await expect(rc.receiptHandlers.rcptReadPhoto(ctx('member-nokey'), { image: PHOTO })).rejects.toThrow(/본인 AI 키/);
  });
  it('사진이 아니거나 너무 크면 거절', async () => {
    await expect(rc.receiptHandlers.rcptReadPhoto(ctx('member-a'), { image: 'data:text/plain;base64,aGk=' })).rejects.toThrow(/사진/);
    const big = 'data:image/png;base64,' + 'A'.repeat(6 * 1024 * 1024);
    await expect(rc.receiptHandlers.rcptReadPhoto(ctx('member-a'), { image: big })).rejects.toThrow(/4MB/);
  });
  it('발행 칸 채우기(issue)는 거래처·품목으로 돌려준다', async () => {
    rc.setVisionCaller(async () => '{"partner":{"name":"고객사","bizNo":"1234567890"},"date":"2026-11-09","lines":[{"name":"디자인","qty":2,"unitPrice":"50,000"}]}');
    const r = await rc.receiptHandlers.rcptReadPhoto(ctx('member-a'), { image: PHOTO, mode: 'issue' });
    expect(r.issue.partner).toMatchObject({ name: '고객사', bizNo: '123-45-67890' });
    expect(r.issue.lines[0]).toMatchObject({ name: '디자인', qty: 2, unitPrice: 50000, supply: 100000, tax: 10000 });
    rc.setVisionCaller(undefined);
  });
});

describe('30일 정리', () => {
  it('30일 지난 문서·증빙만 지우고, 보관 예외 회원은 남긴다', () => {
    const now = Date.now();
    const later = now + 366 * 86_400_000;
    const r = rc.runReceiptRetention(later, new Set(['member-b']));
    expect(r.docs).toBeGreaterThan(0);
    expect(r.evidence).toBeGreaterThan(0);
    // member-b(예외) 증빙은 남는다
    const left = rc.receiptHandlers.rcptEvidenceCsv(ctx('member-b'), {});
    expect(left.csv).toContain('남의 가게');
    expect(rc.receiptHandlers.rcptEvidenceCsv(ctx('member-a'), {}).csv).not.toContain('문구점');
  });
});

describe('홈택스 일괄발급 엑셀(2026-11-12)', () => {
  const ME = { name: '에이상회', ceo: '홍길동', bizNo: '220-81-62517', address: '서울시 중구', bizType: '도소매', bizItem: '문구', email: 'a@example.com' };
  const PARTNER = { name: '비상사', ceo: '김비', bizNo: '2208162517', address: '부산시', bizType: '서비스', bizItem: '컨설팅', email: 'b@example.com' };
  const sheetOf = async (b64: string) => {
    const { readZip } = await import('../../src/server/zipLite.ts');
    const entries = readZip(Buffer.from(b64, 'base64'));
    return { names: entries.map((e) => e.name), sheet: entries.find((e) => e.name === 'xl/worksheets/sheet1.xml')!.data.toString('utf8') };
  };
  const cell = (xml: string, ref: string) => xml.match(new RegExp(`<c r="${ref}"[^>]*><is><t[^>]*>([^<]*)</t>`))?.[1];

  it('한 건 → 59칸, 앞자리 0·숫자만 등록번호·품목 4줄 칸·영수/청구', () => {
    const { row, problems } = core.hometaxRow(core.cleanBiz(ME), { date: '2026-11-05', taxMode: 'separate', lines: [{ name: '볼펜', spec: '0.5', qty: 10, unitPrice: 1000, supply: 10000, tax: 1000 }], supply: 10000, tax: 1000, partner: core.cleanBiz(PARTNER), purpose: '청구', memo: '' });
    expect(problems).toEqual([]);
    expect(row).toHaveLength(core.HOMETAX_COLS);
    expect(row!.slice(0, 3)).toEqual(['01', '20261105', '2208162517']);
    expect(row![10]).toBe('2208162517');
    expect(row!.slice(19, 21)).toEqual(['10000', '1000']);
    expect(row!.slice(22, 29)).toEqual(['05', '볼펜', '0.5', '10', '1000', '10000', '1000']);
    expect(row![58]).toBe('02');
    expect(core.colName(58)).toBe('BG');
  });

  it('못 넣는 건은 이유를 돌려준다(면세·품목 5줄·잘못된 번호)', () => {
    const base = { date: '2026-11-05', lines: [{ name: 'a', spec: '', qty: 1, unitPrice: 1, supply: 1, tax: 0 }], supply: 1, tax: 0, partner: core.cleanBiz(PARTNER) };
    expect(core.hometaxRow(core.cleanBiz(ME), { ...base, taxMode: 'none' }).problems.join()).toMatch(/전자계산서/);
    expect(core.hometaxRow(core.cleanBiz(ME), { ...base, lines: Array(5).fill(base.lines[0]) }).problems.join()).toMatch(/4줄/);
    expect(core.hometaxRow(core.cleanBiz({ ...ME, bizNo: '1234567890' }), base).problems.join()).toMatch(/내 사업자/);
    expect(core.cutBytes('가나다abc', 5)).toBe('가나');
    expect(core.cutBytes('ab가', 4)).toBe('ab가');
  });

  it('명령 — 공식 양식 7행부터 채우고, 남의 문서·다른 종류는 넣지 않는다', async () => {
    const h = rc.receiptHandlers;
    h.rcptSaveProfile(ctx('member-h'), { profile: ME });
    const d1 = h.rcptSaveDoc(ctx('member-h'), { doc: { kind: 'tax_invoice', date: '2026-11-03', taxMode: 'separate', lines: [{ name: '볼펜 & <잉크>', qty: 2, unitPrice: 5000 }], partner: PARTNER, purpose: '영수' } }).doc;
    const d2 = h.rcptSaveDoc(ctx('member-h'), { doc: { kind: 'tax_invoice', date: '2026-11-04', taxMode: 'none', lines: [{ name: '쌀', qty: 1, unitPrice: 30000 }], partner: PARTNER } }).doc;
    const st = h.rcptSaveDoc(ctx('member-h'), { doc: { kind: 'statement', date: '2026-11-04', taxMode: 'separate', lines: [{ name: '명세', qty: 1, unitPrice: 1 }], partner: PARTNER } }).doc;
    h.rcptSaveProfile(ctx('member-x'), { profile: ME });
    const other = h.rcptSaveDoc(ctx('member-x'), { doc: { kind: 'tax_invoice', date: '2026-11-01', taxMode: 'separate', lines: [{ name: '남의것', qty: 1, unitPrice: 100 }], partner: PARTNER } }).doc;

    const r = h.rcptHometaxXlsx(ctx('member-h'), { ids: [d1.id, d2.id, st.id, other.id] });
    expect(r.count).toBe(1);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].reasons.join()).toMatch(/전자계산서/);
    // 실제 엑셀로 열어 볼 때: HOMETAX_SAMPLE=<저장 경로> 로 시험을 돌리면 만든 파일을 저장
    if (process.env.HOMETAX_SAMPLE) (await import('node:fs')).writeFileSync(process.env.HOMETAX_SAMPLE, Buffer.from(r.base64, 'base64'));
    const { names, sheet } = await sheetOf(r.base64);
    expect(names).toContain('xl/worksheets/sheet2.xml'); // 항목설명 등 다른 시트 그대로
    expect(cell(sheet, 'A7')).toBe('01');
    expect(cell(sheet, 'B7')).toBe('20261103');
    expect(cell(sheet, 'X7')).toBe('볼펜 &amp; &lt;잉크&gt;');
    expect(cell(sheet, 'T7')).toBe('10000');
    expect(cell(sheet, 'BG7')).toBe('01');
    expect(sheet).toContain('<c r="A8" s="41"/>'); // 8행은 비어 있음
    expect(sheet).not.toContain('남의것');
    expect(() => h.rcptHometaxXlsx(ctx('member-h'), { ids: [d2.id] })).toThrow(/전자계산서/);
    expect(() => h.rcptHometaxXlsx(ctx('member-h'), { ids: [] })).toThrow(/골라/);
  });
});
