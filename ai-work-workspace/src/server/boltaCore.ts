// 세금계산서 발급대행 — 볼타(2026-11-13, 주인님 「일단 볼타로 정리해」, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5).
// 외부 호출 없는 순수 함수(시험 가능): 인증 헤더, 키 → 테스트/실제, 저장한 세금계산서 → 볼타 정발행 데이터, 요청 번호.
// 출처(공식 문서 docs.bolta.io): 인증 = HTTP Basic(API 키 + ":" → base64), 키 앞부분 test_/live_로 환경 구분(authentication.md),
// 정발행 POST https://xapi.bolta.io/v1/taxInvoices/issue 본문(issue-tax-invoice.md), 품목 1~16개, 중복 방지 헤더 Bolta-Client-Reference-Id.
import { randomBytes } from 'node:crypto';
import { cutBytes, isValidBizNo, type BizInfo, type HometaxDoc } from './receiptsCore';

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
