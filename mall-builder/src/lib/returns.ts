// M2-7(2026-11-15) 반품·취소 강화 — 사유·단계·환불 상태 라벨과 반품비 계산(순수 함수, 단위 시험). DB 0099
export type ReturnReason = "change_mind" | "defect" | "wrong_item" | "other";
export const RETURN_REASONS: { value: ReturnReason; label: string; fee: boolean }[] = [
  { value: "change_mind", label: "단순 변심", fee: true },
  { value: "defect", label: "상품 불량·파손", fee: false },
  { value: "wrong_item", label: "다른 상품이 옴(오배송)", fee: false },
  { value: "other", label: "기타", fee: true },
];
export const RETURN_STEP_LABEL: Record<string, string> = { requested: "반품 요청 접수", collecting: "회수 중", collected: "회수 완료(입고 확인)" };
export const REFUND_STATUS_LABEL: Record<string, string> = { none: "", pending: "환불 대기", done: "환불 완료" };
export const RETURN_FEE_MAX = 100_000;

export function reasonLabel(v: string | null | undefined): string {
  return RETURN_REASONS.find((r) => r.value === v)?.label ?? "";
}

/** 사유별 반품비 기본값 — 변심·기타면 몰 설정값, 불량·오배송이면 0. 결제 금액을 넘지 않게 */
export function defaultReturnFee(reason: string | null | undefined, storeFee: number, total: number): number {
  const r = RETURN_REASONS.find((x) => x.value === reason);
  const fee = r && !r.fee ? 0 : Math.max(0, Math.floor(storeFee || 0));
  return Math.min(fee, Math.max(0, total));
}

/** 몰 설정 반품비 칸 — 빈 값은 0, 숫자·쉼표만, 0~10만 원 */
export function parseReturnFee(v: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const s = String(v ?? "").replace(/[,\s원]/g, "");
  if (s === "") return { ok: true, value: 0 };
  if (!/^\d{1,7}$/.test(s)) return { ok: false, error: "반품비는 숫자로 넣어 주세요." };
  const n = Number(s);
  if (n > RETURN_FEE_MAX) return { ok: false, error: `반품비는 ${RETURN_FEE_MAX.toLocaleString("ko-KR")}원 이하로 넣어 주세요.` };
  return { ok: true, value: n };
}

export function storeReturnFee(settings: unknown): number {
  const v = (settings as { return_fee?: unknown } | null)?.return_fee;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** 무통장 결제 주문인가(환불 계좌가 필요한 주문) */
export function needsRefundAccount(o: { is_card: boolean; is_credit: boolean }): boolean {
  return !o.is_card && !o.is_credit;
}

/** 화면에 계좌번호를 다 보여 주지 않을 때(유저 본인 확인용) — 뒤 4자리만 */
export function maskAccount(acc: string): string {
  const d = acc.replace(/\D/g, "");
  return d.length <= 4 ? "****" : `${"*".repeat(Math.min(8, d.length - 4))}${d.slice(-4)}`;
}
