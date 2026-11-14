// 세금계산서 발급대행 — 볼타(2026-11-13, 주인님 「일단 볼타로 정리해」, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5).
// 외부 호출 없는 순수 함수(시험 가능): 인증 헤더, 키 → 테스트/실제, 저장한 세금계산서 → 볼타 정발행 데이터, 요청 번호.
// 출처(공식 문서 docs.bolta.io): 인증 = HTTP Basic(API 키 + ":" → base64), 키 앞부분 test_/live_로 환경 구분(authentication.md),
// 정발행 POST https://xapi.bolta.io/v1/taxInvoices/issue 본문(issue-tax-invoice.md), 품목 1~16개, 중복 방지 헤더 Bolta-Client-Reference-Id.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cleanBiz, cleanLines, cutBytes, docTotals, isValidBizNo, type BizInfo, type HometaxDoc } from './receiptsCore';

export const BOLTA_KEY_PROVIDER = 'bolta_api_key';
export const BOLTA_API = 'https://xapi.bolta.io';
export const BOLTA_MAX_ITEMS = 16;
export type BoltaMode = 'test' | 'live';

export const boltaAuth = (apiKey: string) => `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
/** 키 앞부분으로 환경을 정한다. 모르는 형식은 null */
export const boltaModeOf = (apiKey: string | null | undefined): BoltaMode | null =>
  !apiKey ? null : apiKey.startsWith('live_') ? 'live' : apiKey.startsWith('test_') ? 'test' : null;

/** 요청 번호(Bolta-Client-Reference-Id, 255자 이하) — 볼타는 같은 번호를 두 번 받지 않는다 */
export function newClientRef(now = Date.now()): string {
  const d = new Date(now + 9 * 3_600_000).toISOString().slice(0, 10).replace(/-/g, '');
  return `aww-${d}-${randomBytes(8).toString('hex')}`;
}

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const int = (n: unknown) => Math.trunc(Number(n) || 0);
const phone = (v: unknown) => (/^\d{2,3}-\d{3,4}-\d{4}$/.test(String(v ?? '')) ? String(v) : undefined);
const opt = (v: unknown, max: number) => {
  const s = cutBytes(v, max);
  return s ? s : undefined;
};

/** 저장한 세금계산서 한 건 → 볼타 정발행 본문. 못 보내는 이유가 있으면 problems(한국어) */
export function boltaInvoice(me: BizInfo | null, d: HometaxDoc): { body: Record<string, unknown> | null; problems: string[] } {
  const problems: string[] = [];
  const meNo = digits(me?.bizNo);
  const pNo = digits(d.partner?.bizNo);
  if (!me?.name || !me.ceo) problems.push('「내 사업자」의 상호·대표자를 저장해 주세요.');
  if (!isValidBizNo(meNo)) problems.push('「내 사업자」의 사업자등록번호가 올바르지 않습니다.');
  if (!me?.email) problems.push('「내 사업자」의 이메일이 필요합니다(볼타 발급 담당자).');
  if (!d.partner?.name) problems.push('거래처 상호가 비어 있습니다.');
  if (!d.partner?.ceo) problems.push('거래처 대표자 이름이 비어 있습니다.');
  if (!d.partner?.email) problems.push('거래처 이메일이 필요합니다(세금계산서를 받는 사람).');
  if (pNo.length === 10 ? !isValidBizNo(pNo) : pNo.length !== 13) problems.push('거래처 등록번호는 사업자등록번호 10자리(또는 주민등록번호 13자리)여야 합니다.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) problems.push('작성일자가 없습니다.');
  if (!d.lines?.length) problems.push('품목이 없습니다.');
  if ((d.lines?.length ?? 0) > BOLTA_MAX_ITEMS) problems.push(`품목은 한 장에 ${BOLTA_MAX_ITEMS}줄까지입니다.`);
  if ((d.lines ?? []).some((l) => int(l.supply) < 1)) problems.push('공급가액이 0원인 품목이 있습니다.');
  if (problems.length) return { body: null, problems };

  const taxFree = d.taxMode === 'none';
  const body: Record<string, unknown> = {
    date: d.date,
    purpose: d.purpose === '청구' ? 'CLAIM' : 'RECEIPT',
    taxType: taxFree ? 'TAX_FREE' : 'TAXABLE',
    supplier: {
      identificationNumber: meNo,
      organizationName: cutBytes(me!.name, 70),
      representativeName: cutBytes(me!.ceo, 30),
      address: opt(me!.address, 150),
      businessType: opt(me!.bizType, 40),
      businessItem: opt(me!.bizItem, 40),
      manager: { email: me!.email, name: opt(me!.ceo, 30), telephone: phone(me!.phone) },
    },
    supplied: {
      identificationNumber: pNo,
      organizationName: cutBytes(d.partner.name, 70),
      representativeName: cutBytes(d.partner.ceo, 30),
      address: opt(d.partner.address, 150),
      businessType: opt(d.partner.bizType, 40),
      businessItem: opt(d.partner.bizItem, 40),
      managers: [{ email: d.partner.email, name: opt(d.partner.ceo, 30) }],
    },
    items: d.lines.map((l) => ({
      date: d.date,
      name: cutBytes(l.name, 100),
      specification: opt(l.spec, 60),
      quantity: Number(l.qty) || undefined,
      unitPrice: int(l.unitPrice) || undefined,
      supplyCost: int(l.supply),
      tax: taxFree ? null : int(l.tax),
    })),
    description: opt(d.memo, 150),
  };
  return { body, problems };
}

// ---------------------------------------------------------------- 수정발행(2026-11-15, 플랜 docs/PLAN_20261115_BOLTA_AMEND.md)
// 출처: docs.bolta.io/docs/api-introduction/amendment-guide.md, openapi.yaml(/v1/taxInvoices/{issuanceKey}/amend/*).
// 국세청에 나간 세금계산서는 지울 수 없어 「발급 취소」도 수정발행(계약의 해제·착오에 의한 이중발급)이다.
export type AmendReason = 'termination' | 'doubleIssuance' | 'changeSupplyCost' | 'return' | 'misspell';
export const AMEND_REASONS: Record<AmendReason, string> = {
  termination: '계약의 해제',
  doubleIssuance: '착오에 의한 이중발급',
  changeSupplyCost: '공급가액 변동',
  return: '환입(반품)',
  misspell: '기재사항 착오정정',
};
export const isAmendReason = (v: unknown): v is AmendReason => typeof v === 'string' && v in AMEND_REASONS;
export interface AmendLine { name: string; spec?: string; qty?: number; unitPrice?: number; supply: number; tax?: number | null }
export interface AmendInput { date?: string; lines?: AmendLine[]; doc?: Partial<HometaxDoc> }

const kstToday = (now: number) => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const taxFreeOf = (d: Pick<HometaxDoc, 'taxMode'>) => d.taxMode === 'none';

/** 원본 세금계산서 + 사유 + 입력 → 볼타 수정발행 본문(이중발급은 본문 없음 = null). amount = 이번 수정으로 바뀌는 합계(공급가액 + 세액, 음수 가능) */
export function boltaAmendBody(
  reason: AmendReason,
  orig: HometaxDoc,
  input: AmendInput,
  me: BizInfo | null,
  now = Date.now(),
): { body: Record<string, unknown> | null; amount: number; problems: string[] } {
  const problems: string[] = [];
  const origTotal = int(orig.supply) + int(orig.tax);
  const taxFree = taxFreeOf(orig);
  const today = kstToday(now);
  const needDate = (label: string) => {
    if (!isDate(input.date)) problems.push(`${label}를 입력해 주세요.`);
    else if (input.date > today && reason !== 'changeSupplyCost') problems.push(`${label}는 오늘이나 이전 날짜여야 합니다.`);
  };
  const lines = (input.lines ?? []).filter((l) => l && (String(l.name ?? '').trim() || int(l.supply) !== 0));
  const linesOk = () => {
    if (!lines.length) problems.push('품목을 1줄 이상 입력해 주세요.');
    if (lines.length > BOLTA_MAX_ITEMS) problems.push(`품목은 ${BOLTA_MAX_ITEMS}줄까지입니다.`);
    if (lines.some((l) => !String(l.name ?? '').trim())) problems.push('품목 이름이 비어 있는 줄이 있습니다.');
    if (lines.some((l) => int(l.supply) === 0)) problems.push('공급가액이 0원인 줄이 있습니다.');
  };
  // 세액: 과세면 입력값(없으면 공급가액의 10% — 문서 저장 때와 같이 내림, 마이너스는 절댓값을 내림), 면세면 null
  const tenth = (s: number) => Math.sign(s) * Math.floor(Math.abs(s) * 0.1);
  const taxOf = (l: AmendLine) => (taxFree ? null : l.tax === undefined || l.tax === null || String(l.tax) === '' || Number.isNaN(Number(l.tax)) ? tenth(int(l.supply)) : int(l.tax));
  const toItems = (date: string) => lines.map((l) => {
    const q = Number(l.qty);
    return {
      date,
      name: cutBytes(l.name, 100),
      specification: opt(l.spec, 60),
      quantity: q ? q : undefined,
      unitPrice: Number(l.unitPrice) ? Number(l.unitPrice) : undefined,
      supplyCost: int(l.supply),
      tax: taxOf(l),
    };
  });
  const sum = (items: { supplyCost: number; tax: number | null }[]) => items.reduce((s, i) => s + i.supplyCost + (i.tax ?? 0), 0);

  switch (reason) {
    case 'termination': {
      needDate('계약 해제일(작성일자)');
      if ((orig.lines ?? []).some((l) => int(l.supply) < 0)) problems.push('공급가액이 마이너스인 품목이 있는 세금계산서는 계약의 해제로 고칠 수 없습니다.');
      return problems.length ? { body: null, amount: 0, problems } : { body: { date: input.date }, amount: -origTotal, problems };
    }
    case 'doubleIssuance':
      return { body: null, amount: -origTotal, problems };
    case 'changeSupplyCost': {
      needDate('변동일(작성일자)');
      linesOk();
      if (problems.length) return { body: null, amount: 0, problems };
      const items = toItems(input.date!);
      return { body: { date: input.date, taxType: taxFree ? 'TAX_FREE' : 'TAXABLE', items }, amount: sum(items), problems };
    }
    case 'return': {
      needDate('환입일');
      linesOk();
      if (!problems.length && lines.reduce((s, l) => s + int(l.supply), 0) >= 0) problems.push('환입은 돌려받은 금액이라 공급가액 합계가 마이너스여야 합니다(예: -20000).');
      if (lines.some((l) => Number(l.qty) === 0 && l.qty !== undefined && l.qty !== null && String(l.qty) !== '')) problems.push('수량에 0은 넣을 수 없습니다(비워 두면 됩니다).');
      if (problems.length) return { body: null, amount: 0, problems };
      const items = toItems(input.date!);
      return { body: { date: input.date, items }, amount: sum(items), problems };
    }
    case 'misspell': {
      // 고친 내용은 문서를 저장할 때와 같은 계산(cleanLines·docTotals·cleanBiz)으로 다시 맞춘다 — 화면 값만 믿지 않음
      const d = input.doc ?? {};
      const taxMode = d.taxMode === 'included' || d.taxMode === 'none' || d.taxMode === 'separate' ? d.taxMode : orig.taxMode;
      const fixedLines = d.lines ? cleanLines(d.lines, taxMode ?? 'separate') : orig.lines;
      const fixed: HometaxDoc = {
        ...orig,
        date: isDate(input.date) ? input.date : isDate(d.date) ? d.date : orig.date,
        taxMode,
        lines: fixedLines,
        ...docTotals(fixedLines),
        partner: d.partner ? cleanBiz({ ...orig.partner, ...d.partner }) : orig.partner,
        purpose: d.purpose === '청구' || d.purpose === '영수' ? d.purpose : orig.purpose,
      };
      if (isDate(fixed.date) && fixed.date > today) problems.push('작성일자는 오늘이나 이전 날짜여야 합니다.');
      if (taxFreeOf(fixed) !== taxFree) problems.push('과세와 면세는 서로 바꿀 수 없습니다(볼타·국세청 규칙).');
      const r = boltaInvoice(me, fixed);
      problems.push(...r.problems);
      if (problems.length || !r.body) return { body: null, amount: 0, problems };
      const body = { ...r.body };
      delete body.description; // 착오정정 본문은 정발행 형식에서 trustee·description을 뺀 것
      delete body.trustee;
      const fixedTotal = sum(body.items as { supplyCost: number; tax: number | null }[]);
      return { body, amount: fixedTotal - origTotal, problems };
    }
  }
}

/** 볼타 오류 응답({code, message, traceId}) → 회원에게 보일 한국어 문장 */
export function boltaErrorText(status: number, e: { code?: unknown; message?: unknown } | null | undefined): string {
  if (status === 401) return '볼타 API 키가 맞지 않습니다. 「API키등록·플랫폼연동」에서 키를 확인해 주세요.';
  const code = typeof e?.code === 'string' ? e.code : '';
  const known: Record<string, string> = {
    NOT_FOUND_CERTIFICATE: '공동인증서가 등록되지 않았습니다. 「공동인증서 등록」을 먼저 해 주세요.',
    INVALID_SUPPLIER_BUSINESS: '이 볼타 키에 「내 사업자」(발급자)가 등록돼 있지 않거나 사업자번호가 올바르지 않습니다.',
    PAYMENT_REQUIRED: '볼타 포인트가 부족합니다. 볼타 개발자센터에서 충전해 주세요.',
    AVAILABLE_POINTS_INSUFFICIENT: '볼타에서 지금 쓸 수 있는 포인트가 부족합니다.',
  };
  const msg = known[code] ?? (typeof e?.message === 'string' && e.message.trim() ? e.message.trim() : `볼타 요청이 실패했습니다(${status}).`);
  return code && !known[code] ? `${msg} (볼타 코드 ${code})` : msg;
}

// ---------------------------------------------------------------- 웹훅(2026-11-13, 결과 자동 수신)
// 출처: docs.bolta.io/docs/api-introduction/webhook-events.md — Standard Webhooks 규격.
// 헤더 webhook-id · webhook-timestamp(초) · webhook-signature("v1,<base64>" 여러 개 가능, 공백 구분),
// 서명 대상 = `${id}.${timestamp}.${원문 body}`, HMAC-SHA256, 키 = 서명 키(whsec_ 뒤 부분을 base64로 푼 바이트).
export const BOLTA_WEBHOOK_PROVIDER = 'bolta_webhook_secret';
const WEBHOOK_TOLERANCE_SEC = 300;

export function verifyBoltaWebhook(secret: string, h: { id?: string | null; timestamp?: string | null; signature?: string | null }, rawBody: string, now = Date.now()): string | null {
  if (!h.id || !h.timestamp || !h.signature) return '서명 헤더가 없습니다.';
  const ts = Number(h.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > WEBHOOK_TOLERANCE_SEC) return '요청 시각이 맞지 않습니다.';
  const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64');
  if (!key.length) return '서명 키 형식이 올바르지 않습니다.';
  const expected = createHmac('sha256', key).update(`${h.id}.${h.timestamp}.${rawBody}`).digest();
  for (const part of h.signature.split(' ')) {
    const [ver, sig] = part.split(',');
    if (ver !== 'v1' || !sig) continue;
    const got = Buffer.from(sig, 'base64');
    if (got.length === expected.length && timingSafeEqual(got, expected)) return null;
  }
  return '서명이 맞지 않습니다.';
}

/** 웹훅 실패 사유(data.cause) → 한국어 */
export function boltaCauseText(cause: { code?: unknown; message?: unknown } | null | undefined): string {
  const code = typeof cause?.code === 'string' ? cause.code : '';
  const known: Record<string, string> = {
    INVALID_SUPPLIER_BUSINESS: '「내 사업자」가 볼타에 등록돼 있지 않거나 휴·폐업 상태입니다.',
    INVALID_SUPPLIED_BUSINESS: '거래처 사업자등록번호가 올바르지 않거나 휴·폐업 상태입니다.',
    INVALID_CERTIFICATE: '공동인증서가 만료됐거나 폐기됐습니다. 인증서를 다시 등록해 주세요.',
    CERTIFICATE_UNAVAILABLE: '공동인증서를 쓸 수 없습니다. 인증서를 다시 등록해 주세요.',
    SIGNING_CERTIFICATE_EXPIRED: '공동인증서가 만료됐습니다. 인증서를 다시 등록해 주세요.',
    FIELD_LENGTH_EXCEEDED: '입력한 내용이 너무 깁니다(상호·품목·비고 길이를 줄여 주세요).',
    INTERNAL_SERVER_ERROR: '볼타 내부 오류입니다. 잠시 뒤 다시 발급해 주세요.',
  };
  if (known[code]) return known[code];
  const msg = typeof cause?.message === 'string' && cause.message.trim() ? cause.message.trim().slice(0, 200) : '발급에 실패했습니다.';
  return code ? `${msg} (볼타·국세청 코드 ${code})` : msg;
}
