// S70(B2B-20261119-S70-FRONT) 주문서 현금영수증 — 판단만 하는 순수 함수(단위 시험 대상, DB·네트워크 없음).
// 실제 접수는 DB 0105 mall_builder_cash_receipt_checkout: 주문 행을 잠근 채 「본인·무통장 입금 대기·1원 이상·세금계산서 없음·처음 신청」일
// 때만 0100 신청을 「신청함」으로 기록하고(발급 호출 없음), 아니면 {accepted:false, reason:'not_eligible'}. 앱은 이 판정을 대신하지 않는다.
import { parseCashReceiptForm } from "../../../../../lib/cash-receipt.ts";

/** 주문은 됐는데 현금영수증 접수가 안 된 모든 경우(not_eligible·오류)에 보이는 고정 안내 — DB 오류 원문·번호를 넣지 않는다 */
export const CHECKOUT_CR_FAIL = "현금영수증 신청이 처리되지 않았습니다. 주문 상세 아래 현금영수증 칸에서 다시 신청해 주세요.";
export const CHECKOUT_CR_WITH_INVOICE = "세금계산서와 현금영수증은 하나만 고를 수 있습니다.";

export type CheckoutCashReceipt =
  | { kind: "none" }
  | { kind: "error"; error: string }
  | { kind: "request"; type: string; value: string; purpose: string };

/**
 * 주문 만들기 「전」 — 무통장에서 현금영수증을 골랐을 때만 형식·세금계산서 동시 선택을 검사(틀리면 주문을 만들지 않음).
 * 카드·외상이면 골랐어도 무시(화면에서도 안 보임). 오류 문구는 고정 문구만(입력값 없음).
 */
export function readCheckoutCashReceipt(form: { get(name: string): unknown }, payMethod: string): CheckoutCashReceipt {
  if (form.get("want_cash_receipt") !== "on" || payMethod !== "bank") return { kind: "none" };
  if (form.get("want_invoice") === "on") return { kind: "error", error: CHECKOUT_CR_WITH_INVOICE };
  const v = parseCashReceiptForm(String(form.get("cr_kind") ?? ""), String(form.get("cr_value") ?? ""));
  return v.ok ? { kind: "request", type: v.type, value: v.value, purpose: v.purpose } : { kind: "error", error: v.error };
}

/** 주문 만든 「뒤」 0105 결과 → 접수되면 null, 아니면(not_eligible·오류) 고정 안내. 결과 원문은 쓰지 않는다 */
export function checkoutCashReceiptNotice(res: { data: unknown; error: unknown }): string | null {
  const accepted = !res.error && (res.data as { accepted?: unknown } | null)?.accepted === true;
  return accepted ? null : CHECKOUT_CR_FAIL;
}
