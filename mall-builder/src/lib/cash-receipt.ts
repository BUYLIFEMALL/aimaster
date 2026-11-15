// M2-10(2026-11-15) 현금영수증(볼타) — 표시 이름·몰 설정 읽기·신청 칸 검사(순수 함수, 단위 시험). 실제 검사·발급은 DB 0100.

export type CashReceiptStatus = "requested" | "issuing" | "issued" | "failed" | "unknown" | "cancelling" | "cancelled" | "cancel_failed";
export type CashReceipt = {
  type: "PHONE" | "BUSINESS_REGISTRATION_NUMBER";
  value: string;
  purpose: "INCOME_DEDUCTION" | "EXPENSE_PROOF";
  status: CashReceiptStatus;
  amount?: number;
  approval_no?: string;
  error?: string;
  reissue_amount?: number;
};

export const CASH_RECEIPT_STATUS_LABEL: Record<CashReceiptStatus, string> = {
  requested: "신청함 · 입금 확인 뒤 발급",
  issuing: "발급 요청함 · 결과 기다리는 중",
  issued: "발급 완료",
  failed: "발급 안 됨",
  unknown: "결과 확인 필요",
  cancelling: "취소 요청함",
  cancelled: "취소됨",
  cancel_failed: "취소 안 됨",
};

export const CASH_RECEIPT_KINDS = [
  { value: "PHONE:INCOME_DEDUCTION", label: "휴대폰 번호 · 소득공제(개인)" },
  { value: "PHONE:EXPENSE_PROOF", label: "휴대폰 번호 · 지출증빙" },
  { value: "BUSINESS_REGISTRATION_NUMBER:EXPENSE_PROOF", label: "사업자등록번호 · 지출증빙" },
] as const;

export function purposeLabel(p: string): string {
  return p === "INCOME_DEDUCTION" ? "소득공제" : "지출증빙";
}

/** 몰 설정 settings.cash_receipt.enabled */
export function cashReceiptEnabled(settings: unknown): boolean {
  const c = (settings as { cash_receipt?: { enabled?: unknown } } | null)?.cash_receipt;
  return c?.enabled === true;
}

/** 신청할 수 있는 주문인가(화면에서 칸을 보일지) — DB가 다시 검사 */
export function canRequestCashReceipt(order: { status: string; is_card: boolean; is_credit: boolean; has_tax_invoice: boolean }, cr: CashReceipt | null): boolean {
  if (order.is_card || order.is_credit || order.has_tax_invoice) return false;
  if (!["pending_payment", "paid", "preparing", "shipping", "delivered"].includes(order.status)) return false;
  return !cr || cr.status === "failed" || cr.status === "cancelled";
}

/** 신청 칸 검사 — 종류·번호를 DB 함수 인자로 */
export function parseCashReceiptForm(kind: string, value: string): { ok: true; type: string; purpose: string; value: string } | { ok: false; error: string } {
  const found = CASH_RECEIPT_KINDS.find((k) => k.value === kind);
  if (!found) return { ok: false, error: "받을 방법을 골라 주세요." };
  const [type, purpose] = found.value.split(":");
  const digits = value.replace(/\D/g, "");
  if (type === "PHONE" && !/^010\d{8}$/.test(digits)) return { ok: false, error: "휴대폰 번호(010으로 시작하는 11자리)를 넣어 주세요." };
  if (type === "BUSINESS_REGISTRATION_NUMBER" && !/^\d{10}$/.test(digits)) return { ok: false, error: "사업자등록번호 10자리를 넣어 주세요." };
  return { ok: true, type, purpose, value: digits };
}

/** 번호 가리기(화면 표시) — 010-****-5678, 123-**-*7890 */
export function maskReceiptValue(cr: Pick<CashReceipt, "type" | "value">): string {
  const d = cr.value.replace(/\D/g, "");
  if (cr.type === "PHONE") return d.length === 11 ? `${d.slice(0, 3)}-****-${d.slice(7)}` : "****";
  return d.length === 10 ? `${d.slice(0, 3)}-**-*${d.slice(6)}` : "****";
}
