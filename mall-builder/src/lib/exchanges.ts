// M2-12b 교환 — 화면용 순수 함수(이름표·버튼 판단·7일·남은 수량·되돌아갈 주소). 권한·기간·수량·재고·결제 검사는 DB 함수(0102)가 다시 한다.
// 계약: 0102(d9f5906c5·1401c5c1a·a86c53dc1) — from/to_option_based는 접수 때 스냅샷, restocked·reship_deducted는 「실제로 재고가 바뀌었는지」.

export type ExchangeStep = "requested" | "collecting" | "collected" | "reshipped" | "done" | "rejected";
export type ExchangeRow = {
  id: string;
  item_id: string;
  qty: number;
  from_variant_id: string | null;
  to_variant_id: string | null;
  from_option: string;
  to_option: string;
  from_option_based: boolean;
  to_option_based: boolean;
  reason: string;
  memo: string;
  requested_by: "customer" | "staff";
  step: ExchangeStep;
  collect_courier: string;
  collect_tracking: string;
  reship_courier: string;
  reship_tracking: string;
  fee: number;
  fee_status: "none" | "waiting" | "paid";
  restocked: boolean;
  reship_deducted: boolean;
  reject_note: string;
  created_at: string;
};
export type ExchangeItem = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  name_snapshot: string;
  option_snapshot: string;
  qty: number;
  cancelled_qty: number;
};
export type ExchangeVariant = { id: string; product_id: string; key: string; is_active: boolean };

export const EXCHANGE_WINDOW_DAYS = 7;
export const EXCHANGE_REASONS = [
  { value: "size", label: "사이즈·색상 등 옵션 변경", fee: true },
  { value: "change_mind", label: "단순 변심", fee: true },
  { value: "defect", label: "상품 불량·파손", fee: false },
  { value: "wrong_item", label: "다른 상품이 왔어요(오배송)", fee: false },
  { value: "other", label: "기타", fee: true },
] as const;
export const EXCHANGE_STEP_LABEL: Record<ExchangeStep, string> = {
  requested: "교환 접수",
  collecting: "회수 중",
  collected: "회수 완료(입고)",
  reshipped: "새 상품 발송",
  done: "교환 완료",
  rejected: "교환 거절",
};
export const FEE_STATUS_LABEL: Record<ExchangeRow["fee_status"], string> = { none: "교환비 없음", waiting: "교환비 입금 대기", paid: "교환비 입금 확인" };
export const OPEN_STEPS: ExchangeStep[] = ["requested", "collecting", "collected", "reshipped"];

export function exchangeReasonLabel(v: string): string {
  return EXCHANGE_REASONS.find((r) => r.value === v)?.label ?? v;
}

/** 배송 완료 시각 = 실제 상태 전이(다른 상태 → delivered)의 마지막 시각. 같은 상태 기록(교환·회수)은 세지 않음 — DB delivered_at과 같은 규칙 */
export function deliveredAtFromEvents(events: { from_status: string | null; to_status: string; created_at: string }[]): string | null {
  let last: string | null = null;
  for (const e of events) {
    if (e.to_status === "delivered" && e.from_status !== "delivered" && (!last || e.created_at > last)) last = e.created_at;
  }
  return last;
}

/** 교환 신청 남은 날(올림). 배송 완료 이력이 없으면 null(유저 신청 불가) */
export function exchangeDaysLeft(deliveredAt: string | null, now: Date = new Date()): number | null {
  if (!deliveredAt) return null;
  const end = new Date(deliveredAt).getTime() + EXCHANGE_WINDOW_DAYS * 86_400_000;
  const left = end - now.getTime();
  return left > 0 ? Math.ceil(left / 86_400_000) : 0;
}

/** 원래 옵션 상품인지 — 주문 줄 증거(옵션 번호 또는 옵션 글자). 지금 옵션이 남아 있는지는 보지 않음 */
export function itemHadOptions(item: Pick<ExchangeItem, "variant_id" | "option_snapshot">): boolean {
  return item.variant_id !== null || (item.option_snapshot ?? "") !== "";
}

/** 교환할 수 있는 남은 수량 = 주문 − 취소 − 거절 아닌 기존 교환 */
export function remainingQty(item: Pick<ExchangeItem, "id" | "qty" | "cancelled_qty">, exchanges: Pick<ExchangeRow, "item_id" | "qty" | "step">[]): number {
  const used = exchanges.filter((x) => x.item_id === item.id && x.step !== "rejected").reduce((s, x) => s + x.qty, 0);
  return Math.max(item.qty - (item.cancelled_qty ?? 0) - used, 0);
}

export function hasOpenExchange(itemId: string, exchanges: Pick<ExchangeRow, "item_id" | "step">[]): boolean {
  return exchanges.some((x) => x.item_id === itemId && OPEN_STEPS.includes(x.step));
}

/**
 * 상품 줄 하나의 신청 칸 상태. who=customer면 7일 기간도 본다(직원 대리 접수는 기간 제한 없음 — DB와 같음).
 * options = 그 상품의 판매 중 옵션(바꿀 옵션 후보). 원래 옵션 상품인데 후보가 0개면 신청 불가(「쇼핑몰에 문의」).
 */
export function itemRequestState(
  args: { who: "customer" | "staff"; orderStatus: string; daysLeft: number | null; item: ExchangeItem; exchanges: ExchangeRow[]; options: ExchangeVariant[] },
): { ok: true; maxQty: number; needsOption: boolean } | { ok: false; reason: string } {
  const { who, orderStatus, daysLeft, item, exchanges, options } = args;
  if (orderStatus !== "delivered") return { ok: false, reason: "배송 완료된 주문만 교환을 신청할 수 있습니다." };
  if (who === "customer" && (daysLeft === null || daysLeft <= 0)) return { ok: false, reason: `교환은 배송 완료 뒤 ${EXCHANGE_WINDOW_DAYS}일 안에 신청할 수 있습니다. 쇼핑몰에 문의해 주세요.` };
  if (hasOpenExchange(item.id, exchanges)) return { ok: false, reason: "이미 교환이 진행 중입니다." };
  const maxQty = remainingQty(item, exchanges);
  if (maxQty < 1) return { ok: false, reason: "교환할 수 있는 수량이 없습니다." };
  const needsOption = itemHadOptions(item);
  if (needsOption && options.filter((o) => o.is_active).length === 0) return { ok: false, reason: "바꿀 옵션이 없어 신청할 수 없습니다. 쇼핑몰에 문의해 주세요." };
  return { ok: true, maxQty, needsOption };
}

export type StaffExchangeActions = {
  collecting: boolean;
  collected: boolean;
  fee: boolean;
  feePaid: boolean;
  reship: boolean;
  done: boolean;
  reject: boolean;
  /** 재발송이 DB에서 막히는 사정(버튼 대신 안내) — 회수 완료 뒤라 거절은 불가 */
  reshipBlocked: string | null;
};

/** 운영사 단추 — 주문이 delivered가 아니면 진행 단추 없음(거절만 회수 전까지). productHasOptions = 그 상품에 지금 옵션이 있는지 */
export function staffExchangeActions(x: ExchangeRow, orderStatus: string, productHasOptions: boolean): StaffExchangeActions {
  const live = orderStatus === "delivered";
  const beforeReship = x.step === "requested" || x.step === "collecting" || x.step === "collected";
  let reshipBlocked: string | null = null;
  if (x.step === "collected") {
    if (x.fee > 0 && x.fee_status !== "paid") reshipBlocked = "교환비 입금이 확인되면 새 상품을 보낼 수 있습니다.";
    else if (x.to_option_based && !x.to_variant_id) reshipBlocked = "바꿀 옵션이 삭제되어 재발송할 수 없습니다. 쇼핑몰 관리자에게 문의해 주세요.";
    else if (!x.to_option_based && productHasOptions) reshipBlocked = "상품에 옵션이 새로 생겨 재발송할 수 없습니다. 쇼핑몰 관리자에게 문의해 주세요.";
  }
  return {
    collecting: live && x.step === "requested",
    collected: live && (x.step === "requested" || x.step === "collecting"),
    fee: live && beforeReship && x.fee_status !== "paid",
    feePaid: live && x.fee_status === "waiting",
    reship: live && x.step === "collected" && reshipBlocked === null,
    done: live && x.step === "reshipped",
    reject: x.step === "requested" || x.step === "collecting",
    reshipBlocked: live ? reshipBlocked : null,
  };
}

/** 재고 표시 — restocked·reship_deducted는 「실제로 바뀌었는지」(입고·발송 여부는 step으로 본다) */
export function exchangeStockNote(x: Pick<ExchangeRow, "step" | "restocked" | "reship_deducted">): string {
  const parts: string[] = [];
  if (["collected", "reshipped", "done"].includes(x.step)) parts.push(x.restocked ? "회수 재고 되돌림" : "회수 재고 그대로(사유는 주문 이력)");
  if (["reshipped", "done"].includes(x.step)) parts.push(x.reship_deducted ? "발송 재고 차감" : "발송 재고 그대로(재고 관리 안 함)");
  return parts.join(" · ");
}

/** 되돌아갈 주소 — 같은 몰 안의 경로만(외부 주소·상위 경로·두 겹 슬래시 거절) */
export function safeBackPath(slug: string, path: string): string {
  const root = `/s/${slug}`;
  if (typeof path !== "string" || !path.startsWith(`${root}/`) || path.includes("//") || path.includes("..") || path.includes("\\") || /[\s?#]/.test(path)) return root;
  return path;
}

/** 서버 동작 입력 정리 */
export function parseExchangeQty(v: unknown): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n >= 1 && n <= 999 ? n : null;
}
export function parseExchangeFee(v: unknown): number | null {
  const s = String(v ?? "").replace(/[,\s원]/g, "");
  if (!/^\d{1,8}$/.test(s)) return null;
  const n = Number(s);
  return n <= 10_000_000 ? n : null;
}
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
