// 세금계산서 발급대행 — 팝빌(2026-11-13, 주인님 「팝빌 먼저, 바로 구현」·「각 개인이 본인 키값으로」, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5).
// 외부 호출 없는 순수 함수(시험 가능): 토큰 요청 서명, 세금계산서 → 팝빌 발급 데이터, 문서번호.
// 서명 방식 출처: 팝빌 공식 Node 패키지 linkhub 1.8.2(MIT, github.com/linkhub-sdk/node-linkhub) lib/TokenBuilder.js —
//   본문 = SHA-256 → base64, 서명 대상 = "POST\n" + 본문해시 + "\n" + 날짜 + "\n" + ("허용IP\n") + "2.0\n" + "/<서비스>/Token",
//   HMAC-SHA256(키 = SecretKey를 base64로 푼 바이트) → base64, 헤더 Authorization: LINKHUB <LinkID> <서명>.
// 발급 데이터 칸 출처: developers.popbill.com/en/api-reference/taxinvoice/api/issue (RegistIssue).
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { cutBytes, isValidBizNo, type BizInfo, type HometaxDoc } from './receiptsCore';

export const POPBILL_LINK_PROVIDER = 'popbill_link_id';
export const POPBILL_SECRET_PROVIDER = 'popbill_secret_key';
export type PopbillMode = 'test' | 'prod';
export const POPBILL_MAX_LINES = 99;

export const popbillHosts = (mode: PopbillMode) => ({
  auth: 'https://auth.linkhub.co.kr',
  service: mode === 'prod' ? 'POPBILL' : 'POPBILL_TEST',
  api: mode === 'prod' ? 'https://popbill.linkhub.co.kr' : 'https://popbill-test.linkhub.co.kr',
});

/** 토큰 요청(사업자번호별, 30분). 본문 문자열을 그대로 보내야 서명이 맞는다 */
export function tokenRequest(o: { linkId: string; secretKey: string; mode: PopbillMode; corpNum: string; date?: string; forwardIp?: string }) {
  const { auth, service } = popbillHosts(o.mode);
  const uri = `/${service}/Token`;
  const body = JSON.stringify({ access_id: o.corpNum, scope: ['member', '110'] });
  const date = o.date ?? new Date().toISOString();
  const bodyDigest = createHash('sha256').update(body).digest('base64');
  const target = `POST\n${bodyDigest}\n${date}\n${o.forwardIp ? `${o.forwardIp}\n` : ''}2.0\n${uri}`;
  const signature = createHmac('sha256', Buffer.from(o.secretKey, 'base64')).update(target).digest('base64');
  return {
    url: auth + uri,
    body,
    headers: {
      'x-lh-date': date,
      'x-lh-version': '2.0',
      Authorization: `LINKHUB ${o.linkId} ${signature}`,
      'Content-Type': 'application/json',
      ...(o.forwardIp ? { 'x-lh-forwarded': o.forwardIp } : {}),
    } as Record<string, string>,
  };
}

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const int = (n: unknown) => String(Math.trunc(Number(n) || 0));
const qty = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) && v ? String(Math.round(v * 100) / 100) : '';
};

/** 문서번호(팝빌 MgtKey, 24자·영숫자/-/_) — 같은 문서번호는 팝빌이 두 번 받지 않아 이중 발급을 막는다 */
export function newMgtKey(now = Date.now()): string {
  const d = new Date(now + 9 * 3_600_000).toISOString().slice(0, 10).replace(/-/g, '');
  return `AWW${d}${randomBytes(6).toString('hex').toUpperCase()}`.slice(0, 24);
}

/** 저장한 세금계산서 한 건 → 팝빌 즉시 발행(RegistIssue) 데이터. 못 보내는 이유가 있으면 problems */
export function popbillInvoice(me: BizInfo | null, d: HometaxDoc, mgtKey: string): { body: Record<string, unknown> | null; problems: string[] } {
  const problems: string[] = [];
  const meNo = digits(me?.bizNo);
  const pNo = digits(d.partner?.bizNo);
  if (!me?.name || !me.ceo) problems.push('「내 사업자」의 상호·대표자를 저장해 주세요.');
  if (!isValidBizNo(meNo)) problems.push('「내 사업자」의 사업자등록번호가 올바르지 않습니다.');
  if (!d.partner?.name) problems.push('거래처 상호가 비어 있습니다.');
  if (!d.partner?.ceo) problems.push('거래처 대표자 이름이 비어 있습니다(팝빌 발급에 필요).');
  if (pNo.length === 10 ? !isValidBizNo(pNo) : pNo.length !== 13) problems.push('거래처 등록번호는 사업자등록번호 10자리(또는 주민등록번호 13자리)여야 합니다.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) problems.push('작성일자가 없습니다.');
  if (d.taxMode === 'none') problems.push('면세(부가세 없음)는 세금계산서가 아니라 전자계산서로 발급합니다.');
  if (!d.lines?.length) problems.push('품목이 없습니다.');
  if ((d.lines?.length ?? 0) > POPBILL_MAX_LINES) problems.push(`품목은 ${POPBILL_MAX_LINES}줄까지입니다.`);
  if (!/^[A-Za-z0-9_-]{1,24}$/.test(mgtKey)) problems.push('문서번호가 올바르지 않습니다.');
  if (problems.length) return { body: null, problems };

  const date = d.date.replace(/-/g, '');
  const supply = Math.trunc(Number(d.supply) || 0);
  const tax = Math.trunc(Number(d.tax) || 0);
  const body: Record<string, unknown> = {
    issueType: '정발행',
    taxType: '과세',
    chargeDirection: '정과금',
    writeDate: date,
    purposeType: d.purpose === '청구' ? '청구' : '영수',
    supplyCostTotal: String(supply),
    taxTotal: String(tax),
    totalAmount: String(supply + tax),
    invoicerMgtKey: mgtKey,
    invoicerCorpNum: meNo,
    invoicerCorpName: cutBytes(me!.name, 200),
    invoicerCEOName: cutBytes(me!.ceo, 100),
    invoicerAddr: cutBytes(me!.address, 300),
    invoicerBizType: cutBytes(me!.bizType, 100),
    invoicerBizClass: cutBytes(me!.bizItem, 100),
    invoicerEmail: cutBytes(me!.email, 100),
    invoicerTEL: cutBytes(me!.phone, 20),
    invoiceeType: pNo.length === 13 ? '개인' : '사업자',
    invoiceeCorpNum: pNo,
    invoiceeCorpName: cutBytes(d.partner.name, 200),
    invoiceeCEOName: cutBytes(d.partner.ceo, 100),
    invoiceeAddr: cutBytes(d.partner.address, 300),
    invoiceeBizType: cutBytes(d.partner.bizType, 100),
    invoiceeBizClass: cutBytes(d.partner.bizItem, 100),
    invoiceeEmail1: cutBytes(d.partner.email, 100),
    remark1: cutBytes(d.memo, 150),
    detailList: d.lines.map((l, i) => ({
      serialNum: i + 1,
      purchaseDT: date,
      itemName: cutBytes(l.name, 100),
      spec: cutBytes(l.spec, 60),
      qty: qty(l.qty),
      unitCost: int(l.unitPrice),
      supplyCost: int(l.supply),
      tax: int(l.tax),
    })),
  };
  return { body, problems };
}

/** 팝빌 오류 응답 → 회원에게 보일 한국어 문장 */
export function popbillErrorText(e: { code?: unknown; message?: unknown } | null | undefined, fallback = '팝빌 요청이 실패했습니다.'): string {
  const msg = typeof e?.message === 'string' && e.message.trim() ? e.message.trim() : fallback;
  return typeof e?.code === 'number' ? `${msg} (팝빌 코드 ${e.code})` : msg;
}

/** 「없음」 응답(문서 없음·문서번호 없음) — 이 경우에만 같은 문서번호로 다시 보낸다 */
export const POPBILL_NOT_FOUND = new Set([-11000000, -11000005]);
