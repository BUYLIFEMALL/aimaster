// D33 리셀러·제휴 판매 — 코드·수수료율 검사, 수수료 계산(DB 0052와 같은 규칙), 이름표(node --test 대상)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export const PAYOUT_MIN = 10000;
export const REF_COOKIE_DAYS = 30;
export const MAX_RATE = 50;
export const refCookieName = (slug: string) => `mb_ref_${slug.replace(/[^a-z0-9-]/g, "")}`;

export type LedgerKind = "earn" | "reclaim" | "payout" | "payout_cancel" | "adjust";
export const LEDGER_KIND_LABEL: Record<LedgerKind, string> = { earn: "적립", reclaim: "회수(반품·취소)", payout: "출금 신청", payout_cancel: "출금 반려(돌려줌)", adjust: "조정" };
export type PayoutStatus = "requested" | "paid" | "rejected";
export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = { requested: "처리 대기", paid: "지급 완료", rejected: "반려" };

/** 리셀러 코드: 영문 대문자·숫자 4~12자(입력은 소문자도 받아 대문자로) */
export function normalizeCode(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}
export function codeError(code: string): string | null {
  return /^[A-Z0-9]{4,12}$/.test(code) ? null : "리셀러 코드는 영문·숫자 4~12자로 정해 주세요.";
}

/** 리셀러 추가 수수료율(%) — 0 이상 50 이하, 소수 둘째 자리까지(M1-4 0071부터 0% 허용 — 상품 수수료는 상품별 리셀러율) */
export function parseRate(v: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const n = Number(String(v ?? "").trim());
  if (String(v ?? "").trim() === "" || !Number.isFinite(n) || n < 0 || n > MAX_RATE) return { ok: false, error: `리셀러 추가 수수료율은 0~${MAX_RATE}% 사이로 입력해 주세요.` };
  return { ok: true, value: Math.round(n * 100) / 100 };
}

/** 수수료 = (결제 금액 − 배송비) × 수수료율, 원 단위 내림 — 포인트 적립과 같은 기준 금액 */
export function commissionOf(total: number, shippingFee: number, rate: number): number {
  return Math.floor((Math.max(0, total - shippingFee) * rate) / 100);
}

/** 출금 신청 검사 */
export function payoutError(amount: number, balance: number): string | null {
  if (!Number.isInteger(amount) || amount < PAYOUT_MIN) return `출금은 ${PAYOUT_MIN.toLocaleString("ko-KR")}원 이상부터 신청할 수 있습니다.`;
  if (amount > balance) return "출금 가능 금액보다 많습니다.";
  return null;
}

/** 원천징수 3.3% 안내 금액(차감하지 않고 보여 주기만 — 주인님 결정) */
export const withholdingHint = (amount: number) => Math.floor((amount * 3.3) / 100);

/** M1-5(0072) 리셀러 쿠키들(mb_ref_<몰>) → DB 요청 머리글 `x-mb-ref: <몰>=<코드>;…` — 주문 트리거가 그 몰 코드만 골라 읽는다. 없으면 null */
export function refHeaderFromCookies(list: { name: string; value: string }[]): string | null {
  const parts: string[] = [];
  for (const c of list) {
    const m = /^mb_ref_([a-z0-9-]{1,60})$/.exec(c.name);
    if (!m) continue;
    const code = normalizeCode(c.value);
    if (codeError(code)) continue;
    parts.push(`${m[1]}=${code}`);
    if (parts.length >= 20) break;
  }
  return parts.length ? parts.join(";") : null;
}

export const REF_SOURCE_LABEL: Record<"link" | "customer", string> = { link: "제휴 링크로 주문", customer: "가입 때 연결된 손님" };

/** M1-7(0075) 출금 지급 때 공제금액 기본값 — 개인은 사업소득 원천징수 3.3%, 사업자(세금계산서)는 0 */
export function defaultDeduction(amount: number, payeeType: string | undefined | null): number {
  return payeeType === "business" ? 0 : withholdingHint(amount);
}
export const PAYEE_LABEL: Record<"individual" | "business", string> = { individual: "개인(3.3% 원천징수)", business: "사업자(세금계산서)" };
