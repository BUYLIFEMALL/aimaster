// 영수증·세금계산서(2026-11-11) — DB 없이 쓰는 계산·정리 함수. 플랜 docs/PLAN_20261027_RECEIPT_TAX_INVOICE.md §6.
// · 사업자등록번호 형식·검증, 공급가액·부가세 계산, AI가 읽은 사진 결과 정리, 증빙 장부 CSV·월 합계.

export type EvidenceKind = 'receipt' | 'tax_invoice' | 'cash_receipt' | 'card' | 'other';
export const EVIDENCE_KINDS: Record<EvidenceKind, string> = {
  receipt: '영수증',
  tax_invoice: '세금계산서',
  cash_receipt: '현금영수증',
  card: '카드전표',
  other: '기타',
};

export type DocKind = 'receipt' | 'statement' | 'tax_invoice';
export const DOC_KINDS: Record<DocKind, string> = { receipt: '간이영수증', statement: '거래명세서', tax_invoice: '세금계산서' };

/** 부가세 처리: 별도(공급가액 + 10%), 포함(합계에서 나눔), 없음(면세·간이) */
export type TaxMode = 'separate' | 'included' | 'none';

export interface BizInfo {
  bizNo: string;
  name: string;
  ceo: string;
  address: string;
  bizType: string;
  bizItem: string;
  email: string;
  phone: string;
}

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  date: string; // YYYY-MM-DD
  vendor: string;
  bizNo: string;
  supply: number;
  vat: number;
  total: number;
  payment: string;
  memo: string;
}

export interface DocLine {
  name: string;
  spec: string;
  qty: number;
  unitPrice: number;
  supply: number;
  tax: number;
}

const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '');

/** 금액 글자 → 원 단위 정수(쉼표·「원」·공백 무시, 음수는 반품·취소로 허용) */
export function toWon(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : 0;
  const s = str(v, 40).replace(/[,\s원₩]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return 0;
  return Math.round(Number(s));
}

/** 사업자등록번호 → 「123-45-67890」(숫자 10자리가 아니면 입력 그대로 다듬어 돌려줌) */
export function formatBizNo(v: unknown): string {
  const d = str(v, 40).replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : str(v, 40);
}

/** 사업자등록번호 검증(국세청 검증 공식: 가중치 1,3,7,1,3,7,1,3,5) */
export function isValidBizNo(v: unknown): boolean {
  const d = str(v, 40).replace(/\D/g, '');
  if (d.length !== 10) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * w[i];
  sum += Math.floor((Number(d[8]) * 5) / 10);
  return (10 - (sum % 10)) % 10 === Number(d[9]);
}

/** 날짜 글자 → YYYY-MM-DD(못 읽으면 빈 글자) */
export function toDate(v: unknown): string {
  const s = str(v, 40);
  const m = s.match(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/) ?? s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return '';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 품목 한 줄의 공급가액·세액 */
export function calcLine(qty: number, unitPrice: number, mode: TaxMode): { supply: number; tax: number } {
  const amount = Math.round((Number(qty) || 0) * (Number(unitPrice) || 0));
  if (mode === 'none') return { supply: amount, tax: 0 };
  if (mode === 'included') {
    const supply = Math.round(amount / 1.1);
    return { supply, tax: amount - supply };
  }
  return { supply: amount, tax: Math.floor(amount * 0.1) };
}

export function cleanLines(raw: unknown, mode: TaxMode): DocLine[] {
  const arr = Array.isArray(raw) ? raw.slice(0, 50) : [];
  const out: DocLine[] = [];
  for (const r of arr) {
    const o = (r ?? {}) as Record<string, unknown>;
    const name = str(o.name, 100);
    const qty = Number(o.qty) || 0;
    const unitPrice = toWon(o.unitPrice);
    if (!name && !qty && !unitPrice) continue;
    out.push({ name, spec: str(o.spec, 60), qty, unitPrice, ...calcLine(qty, unitPrice, mode) });
  }
  return out;
}

export function docTotals(lines: DocLine[]): { supply: number; tax: number; total: number } {
  const supply = lines.reduce((s, l) => s + l.supply, 0);
  const tax = lines.reduce((s, l) => s + l.tax, 0);
  return { supply, tax, total: supply + tax };
}

export function cleanBiz(raw: unknown): BizInfo {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    bizNo: formatBizNo(o.bizNo),
    name: str(o.name, 100),
    ceo: str(o.ceo, 50),
    address: str(o.address, 200),
    bizType: str(o.bizType, 50),
    bizItem: str(o.bizItem, 50),
    email: str(o.email, 100),
    phone: str(o.phone, 30),
  };
}

const KIND_WORDS: [RegExp, EvidenceKind][] = [
  [/세금\s*계산서|tax[_\s]*invoice/i, 'tax_invoice'],
  [/현금\s*영수증|cash/i, 'cash_receipt'],
  [/카드|전표|card/i, 'card'],
  [/영수증|receipt/i, 'receipt'],
];

/** AI가 사진에서 읽은 값 → 증빙 한 건(합계·공급가액·부가세가 서로 맞게 채움). id는 저장 때 붙임 */
export function normalizeEvidence(raw: unknown): Omit<Evidence, 'id'> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const k = str(o.kind, 40);
  const kind: EvidenceKind = (Object.keys(EVIDENCE_KINDS) as EvidenceKind[]).includes(k as EvidenceKind)
    ? (k as EvidenceKind)
    : (KIND_WORDS.find(([re]) => re.test(k))?.[1] ?? 'receipt');
  let supply = toWon(o.supply);
  let vat = toWon(o.vat);
  let total = toWon(o.total);
  if (!total && (supply || vat)) total = supply + vat;
  if (total && !supply && !vat) {
    // 합계만 보이면 부가세 포함으로 보고 나눈다(면세는 회원이 고침)
    supply = Math.round(total / 1.1);
    vat = total - supply;
  } else if (total && supply && !vat && total !== supply) vat = total - supply;
  else if (total && vat && !supply) supply = total - vat;
  return {
    kind,
    date: toDate(o.date),
    vendor: str(o.vendor, 100),
    bizNo: formatBizNo(o.bizNo),
    supply,
    vat,
    total,
    payment: str(o.payment, 30),
    memo: str(o.memo, 200),
  };
}

/** 회원이 고친 값(화면 입력) → 증빙 한 건. 숫자는 그대로 믿되 형식만 맞춤 */
export function cleanEvidence(raw: unknown): Omit<Evidence, 'id'> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const n = normalizeEvidence({ ...o, total: o.total ?? 0 });
  return { ...n, supply: toWon(o.supply), vat: toWon(o.vat), total: toWon(o.total) || toWon(o.supply) + toWon(o.vat) };
}

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 증빙 장부 → 엑셀에서 바로 열리는 CSV(UTF-8 BOM). 숫자 칸은 숫자 그대로 */
export function evidenceCsv(rows: Evidence[]): string {
  const head = ['날짜', '종류', '거래처', '사업자등록번호', '공급가액', '부가세', '합계', '결제수단', '메모'];
  const body = rows.map((r) => [r.date, EVIDENCE_KINDS[r.kind] ?? r.kind, r.vendor, r.bizNo, r.supply, r.vat, r.total, r.payment, r.memo].map(csvCell).join(','));
  return '﻿' + [head.join(','), ...body].join('\r\n') + '\r\n';
}

/** 월 합계(종류별 + 전체) */
export function monthSummary(rows: Evidence[]): { count: number; supply: number; vat: number; total: number; byKind: Record<string, { count: number; total: number }> } {
  const byKind: Record<string, { count: number; total: number }> = {};
  let supply = 0, vat = 0, total = 0;
  for (const r of rows) {
    supply += r.supply;
    vat += r.vat;
    total += r.total;
    const k = (byKind[r.kind] ??= { count: 0, total: 0 });
    k.count++;
    k.total += r.total;
  }
  return { count: rows.length, supply, vat, total, byKind };
}

/** 사진 읽기 지시문(mode: evidence = 받은 증빙 정리, issue = 발행 칸 채우기) */
export function ocrPrompt(mode: 'evidence' | 'issue', year: number): string {
  const common = `이미지는 한국의 거래 증빙(영수증·세금계산서·현금영수증·카드전표·거래명세서·견적서·명함 등)입니다. 보이는 글자만 읽고 추측하지 마세요. 보이지 않는 값은 빈 글자("") 또는 0으로 두세요. 금액은 쉼표 없는 숫자(원)로. 날짜는 YYYY-MM-DD(연도가 안 보이면 ${year}년). 사업자등록번호는 123-45-67890 형식. 반드시 JSON 하나만 출력하세요.`;
  if (mode === 'evidence') {
    return `${common}
출력 형식: {"kind":"receipt|tax_invoice|cash_receipt|card|other","date":"","vendor":"상호(공급자)","bizNo":"공급자 사업자등록번호","supply":0,"vat":0,"total":0,"payment":"현금|카드|계좌이체 등","memo":"주요 품목 한 줄"}
kind: 세금계산서=tax_invoice, 현금영수증=cash_receipt, 신용·체크카드 매출전표=card, 일반 영수증=receipt.`;
  }
  return `${common}
이 증빙을 보고 「상대방(거래처)」과 품목을 읽어 세금계산서·거래명세서 발행 칸을 채웁니다.
출력 형식: {"partner":{"bizNo":"","name":"상호","ceo":"대표자","address":"","bizType":"업태","bizItem":"종목","email":"","phone":""},"date":"","lines":[{"name":"품목","spec":"규격","qty":1,"unitPrice":0}],"memo":""}`;
}

/** 모델 응답 글자에서 JSON 하나 꺼내기 */
export function parseJsonLoose(text: string): Record<string, unknown> | null {
  const s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const v = JSON.parse(s.slice(a, b + 1));
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- 홈택스 일괄발급 엑셀(2026-11-12)
// 공식 양식 「세금계산서등록양식(일반)」 엑셀업로드양식 시트: 6행 머리글(59칸 A~BG), 7행부터 최대 100건, 모든 칸은 텍스트.
// 품목은 한 장에 4줄까지(일자·품목·규격·수량·단가·공급가액·세액·품목비고 × 4), 끝에 현금·수표·어음·외상미수금·영수(01)/청구(02).

export const HOMETAX_MAX_ROWS = 100;
export const HOMETAX_MAX_LINES = 4;
export const HOMETAX_COLS = 59;

/** 사업자등록번호·주민등록번호 → 숫자만 */
const digits = (v: unknown): string => str(v, 40).replace(/\D/g, '');

/** 홈택스 길이 한도(byte: 한글 2, 영문·숫자 1)에 맞춰 자름 */
export function cutBytes(v: unknown, max: number): string {
  const s = str(v, 400);
  let n = 0;
  let out = '';
  for (const ch of s) {
    n += ch.charCodeAt(0) > 0x7f ? 2 : 1;
    if (n > max) break;
    out += ch;
  }
  return out;
}

const qtyText = (q: number): string => (Number.isInteger(q) ? String(q) : String(Math.round(q * 100) / 100));

export interface HometaxDoc {
  id?: string;
  date: string;
  taxMode?: TaxMode;
  lines: DocLine[];
  supply: number;
  tax: number;
  partner: BizInfo;
  purpose?: string;
  memo?: string;
}

/** 세금계산서 한 건 → 양식 한 줄(59칸). 못 넣는 이유가 있으면 problems에 담고 row는 null */
export function hometaxRow(me: BizInfo | null, d: HometaxDoc): { row: string[] | null; problems: string[] } {
  const problems: string[] = [];
  const meNo = digits(me?.bizNo);
  const pNo = digits(d.partner?.bizNo);
  if (!me?.name || !me.ceo) problems.push('「내 사업자」의 상호·대표자를 저장해 주세요.');
  if (!isValidBizNo(meNo)) problems.push('「내 사업자」의 사업자등록번호가 올바르지 않습니다.');
  if (!d.partner?.name) problems.push('거래처 상호가 비어 있습니다.');
  if (pNo.length === 10 ? !isValidBizNo(pNo) : pNo.length !== 13) problems.push('거래처 등록번호는 사업자등록번호 10자리(또는 주민등록번호 13자리)여야 합니다.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) problems.push('작성일자가 없습니다.');
  if (d.taxMode === 'none') problems.push('면세(부가세 없음)는 세금계산서가 아니라 홈택스 「전자계산서」로 발급합니다.');
  if (!d.lines?.length) problems.push('품목이 없습니다.');
  if ((d.lines?.length ?? 0) > HOMETAX_MAX_LINES) problems.push(`품목이 ${d.lines.length}줄입니다. 홈택스 양식은 한 장에 ${HOMETAX_MAX_LINES}줄까지라 나눠서 작성해 주세요.`);
  if (problems.length) return { row: null, problems };

  const day = d.date.slice(8, 10);
  const row: string[] = [
    '01', // 종류: 일반
    d.date.replace(/-/g, ''),
    meNo, '', cutBytes(me!.name, 70), cutBytes(me!.ceo, 30), cutBytes(me!.address, 150), cutBytes(me!.bizType, 40), cutBytes(me!.bizItem, 60), cutBytes(me!.email, 40),
    pNo, '', cutBytes(d.partner.name, 70), cutBytes(d.partner.ceo, 30), cutBytes(d.partner.address, 150), cutBytes(d.partner.bizType, 40), cutBytes(d.partner.bizItem, 60), cutBytes(d.partner.email, 40), '',
    String(d.supply), String(d.tax), cutBytes(d.memo, 150),
  ];
  for (let i = 0; i < HOMETAX_MAX_LINES; i++) {
    const l = d.lines[i];
    row.push(...(l ? [day, cutBytes(l.name, 100), cutBytes(l.spec, 60), qtyText(l.qty), String(l.unitPrice), String(l.supply), String(l.tax), ''] : ['', '', '', '', '', '', '', '']));
  }
  row.push('', '', '', '', d.purpose === '청구' ? '02' : '01');
  return { row, problems };
}

/** 열 번호(0부터) → 엑셀 열 이름(A, B, … BG) */
export function colName(i: number): string {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
