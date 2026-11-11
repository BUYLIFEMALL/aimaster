// 외상(후불) — DB: 손님 표 credit_limit, mall_builder_credit_ledger, 주문 is_credit (0014_credit.sql)
// 장부 금액 부호: 사용(charge) +, 입금(payment) −, 조정(adjust) ±. 사용 중 금액 = 장부 합계

export type LedgerKind = "charge" | "payment" | "adjust";

export const LEDGER_LABEL: Record<LedgerKind, string> = { charge: "외상 사용", payment: "입금", adjust: "조정" };

/** 남은 한도(0 미만 없음) */
export function creditAvailable(limit: number, balance: number): number {
  return Math.max(0, limit - balance);
}

/** 이 금액을 외상으로 주문할 수 있나 */
export function canUseCredit(limit: number, balance: number, total: number): boolean {
  return limit > 0 && total > 0 && balance + total <= limit;
}

/** 운영자 장부 입력 검사 — 입금은 양수로 받아 −로 기록, 조정은 +/− 그대로 */
export function validateLedgerEntry(
  kind: string,
  amountInput: unknown,
  note: unknown,
): { ok: true; value: { kind: "payment" | "adjust"; amount: number; note: string } } | { ok: false; error: string } {
  if (kind !== "payment" && kind !== "adjust") return { ok: false, error: "입금 또는 조정을 골라 주세요." };
  const s = String(amountInput ?? "").replace(/[,\s원]/g, "");
  if (!/^-?\d+$/.test(s) || Number(s) === 0 || Math.abs(Number(s)) > 1_000_000_000) return { ok: false, error: "금액을 0이 아닌 숫자로 입력해 주세요." };
  const n = Number(s);
  if (kind === "payment" && n < 0) return { ok: false, error: "입금 금액은 양수로 입력해 주세요." };
  const memo = String(note ?? "").trim();
  if (memo.length > 200) return { ok: false, error: "메모는 200자 이내로 입력해 주세요." };
  if (kind === "adjust" && !memo) return { ok: false, error: "조정은 사유 메모가 필요합니다." };
  return { ok: true, value: { kind, amount: kind === "payment" ? -n : n, note: memo } };
}

/** 한도 칸 검사 — 0(외상 안 씀) ~ 10억 */
export function parseCreditLimit(input: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const s = String(input ?? "").replace(/[,\s원]/g, "");
  if (s === "") return { ok: true, value: 0 };
  if (!/^\d+$/.test(s) || Number(s) > 1_000_000_000) return { ok: false, error: "외상 한도는 0 이상 숫자로 입력해 주세요." };
  return { ok: true, value: Number(s) };
}
