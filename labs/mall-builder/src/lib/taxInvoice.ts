// 세금계산서 발행 요청 — DB: 주문 tax_invoice(jsonb) 칸, 함수 mall_builder_request_tax_invoice / mall_builder_mark_tax_invoice_issued (0015)
// 실제 발행은 운영자가 홈택스 등에서 하고, 여기서는 「요청 → 발행 완료」 기록만 한다

export type TaxInvoiceAmendment = { kind: "termination" | "changeSupplyCost"; at: string; supply_diff: number; tax_diff: number; status: "requested" | "unknown" };

export type TaxInvoice = {
  // D19(0039): 볼타 발행 — requested → issuing(접수) → issued / failed(거절, 다시 발행 가능) / unknown(응답 못 받음, 확인 필요)
  status: "requested" | "issuing" | "issued" | "failed" | "unknown";
  provider?: "bolta";
  mode?: string;
  nts_id?: string;
  error?: string;
  amount?: number;
  supply?: number;
  tax?: number;
  terminated?: boolean;
  amendments?: TaxInvoiceAmendment[];
  business_no: string;
  company: string;
  ceo_name: string;
  email: string;
  requested_at: string;
  issued_at?: string;
  note?: string;
};

export const TAX_INVOICE_LABEL = {
  requested: "발행 요청",
  issuing: "발행 처리 중",
  issued: "발행 완료",
  failed: "발행 실패(다시 발행 가능)",
  unknown: "결과 확인 필요",
} as const;

/** 운영자 주문 상세에서 보일 버튼(D19). 카드 주문은 매출전표가 대신하므로 발행 안 함 */
export function taxInvoiceButtons(
  inv: TaxInvoice | null,
  order: { status: string; is_card: boolean },
  hasKey: boolean,
): { issue: boolean; recheck: boolean; amend: boolean; markManual: boolean; reason: string | null } {
  const none = { issue: false, recheck: false, amend: false, markManual: false };
  if (!inv) return { ...none, reason: null };
  if (order.is_card) return { ...none, reason: "카드 결제 주문은 카드 매출전표가 세금계산서를 대신합니다." };
  const closed = ["cancelled", "returned", "cancel_requested", "return_requested"].includes(order.status);
  const canIssue = (inv.status === "requested" || inv.status === "failed") && !closed;
  return {
    issue: canIssue && hasKey,
    recheck: inv.provider === "bolta" && (inv.status === "issuing" || inv.status === "unknown"),
    amend: inv.provider === "bolta" && inv.status === "issued" && !inv.terminated && !(inv.amendments ?? []).some((a) => a.status === "unknown"),
    markManual: canIssue,
    reason: canIssue && !hasKey ? "설정에 볼타 키가 없어 홈택스에서 직접 발행한 뒤 「발행 완료로 표시」를 눌러 주세요." : null,
  };
}

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
