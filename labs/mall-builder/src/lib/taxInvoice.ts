// 세금계산서 발행 요청 — DB: 주문 tax_invoice(jsonb) 칸, 함수 mall_builder_request_tax_invoice / mall_builder_mark_tax_invoice_issued (0015)
// 실제 발행은 운영자가 홈택스 등에서 하고, 여기서는 「요청 → 발행 완료」 기록만 한다

export type TaxInvoice = {
  status: "requested" | "issued";
  business_no: string;
  company: string;
  ceo_name: string;
  email: string;
  requested_at: string;
  issued_at?: string;
  note?: string;
};

export const TAX_INVOICE_LABEL = { requested: "발행 요청", issued: "발행 완료" } as const;

/** 받을 메일 검사 */
export function validateInvoiceEmail(input: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const s = String(input ?? "").trim();
  if (!s) return { ok: false, error: "세금계산서를 받을 메일을 입력해 주세요." };
  if (s.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return { ok: false, error: "메일 주소를 확인해 주세요." };
  return { ok: true, value: s };
}

/** 요청할 수 있는 주문인가 — 취소·반품 주문은 안 됨, 이미 요청했으면 안 됨 */
export function canRequestInvoice(order: { status: string; tax_invoice: TaxInvoice | null }): boolean {
  return !order.tax_invoice && !["cancelled", "returned", "cancel_requested", "return_requested"].includes(order.status);
}
