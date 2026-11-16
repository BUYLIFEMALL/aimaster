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
/** 교환 가능 주문 상태 — DB 0103 exchange_order_status_ok와 같음(배송 완료 + 구매 확정). 7일 기준은 상태가 아니라 실제 배송 시각 */
export const EXCHANGE_ORDER_STATUSES = ["delivered", "confirmed"] as const;
export function isExchangeOrderStatus(status: string): boolean {
  return (EXCHANGE_ORDER_STATUSES as readonly string[]).includes(status);
}
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
): { ok: true; maxQty: number; needsOption: boolean } | { ok: false; code: RequestBlockCode; reason: string } {
  const { who, orderStatus, daysLeft, item, exchanges, options } = args;
  if (!isExchangeOrderStatus(orderStatus)) return { ok: false, code: "status", reason: "배송 완료(구매 확정 포함)된 주문만 교환을 신청할 수 있습니다." };
  if (who === "customer" && (daysLeft === null || daysLeft <= 0)) return { ok: false, code: "window", reason: `교환은 배송 완료 뒤 ${EXCHANGE_WINDOW_DAYS}일 안에 신청할 수 있습니다. 쇼핑몰에 문의해 주세요.` };
  if (hasOpenExchange(item.id, exchanges)) return { ok: false, code: "open", reason: "이미 교환이 진행 중입니다." };
  const maxQty = remainingQty(item, exchanges);
  if (maxQty < 1) return { ok: false, code: "qty", reason: "교환할 수 있는 수량이 없습니다." };
  const needsOption = itemHadOptions(item);
  if (needsOption && options.filter((o) => o.is_active).length === 0) {
    return { ok: false, code: "no_option", reason: who === "staff" ? "판매 중인 옵션이 없어 교환을 접수할 수 없습니다. 상품 옵션을 먼저 확인해 주세요." : "바꿀 옵션이 없어 신청할 수 없습니다. 쇼핑몰에 문의해 주세요." };
  }
  return { ok: true, maxQty, needsOption };
}

/** 신청 불가 이유 — status·open·qty는 안내할 일이 없고, window·no_option은 화면에 안내를 남긴다 */
export type RequestBlockCode = "status" | "window" | "open" | "qty" | "no_option";
export const NOTICE_BLOCK_CODES: RequestBlockCode[] = ["window", "no_option"];

/** 신청 불가 중 화면에 남길 안내(기간 지남은 한 번, 옵션 없음은 상품별). 안내할 것이 없으면 빈 배열 = 빈 상태와 구분 */
export function exchangeNotices(forms: { item: Pick<ExchangeItem, "id" | "name_snapshot">; s: ReturnType<typeof itemRequestState> }[]): { key: string; text: string }[] {
  const seen = new Map<string, string>();
  for (const { item, s } of forms) {
    if (s.ok || !NOTICE_BLOCK_CODES.includes(s.code)) continue;
    if (s.code === "window") seen.set("window", s.reason);
    else seen.set(`opt-${item.id}`, `${item.name_snapshot}: ${s.reason}`);
  }
  return [...seen].map(([key, text]) => ({ key, text }));
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

/**
 * 운영사 단추 — 주문이 delivered가 아니면 진행 단추 없음(거절만 회수 전까지). productHasOptions = 그 상품에 지금 옵션이 있는지.
 * pay = 교환비 카드 결제 화면 상태(feePayState) — 카드 결제가 있으면 금액 변경·무통장 확인·거절 단추를 숨기고, 확인 필요·취소 보류면 재발송도 막는다.
 * (실제 잠금은 DB 0104 지킴 트리거 — 화면은 보조)
 */
export function staffExchangeActions(x: ExchangeRow, orderStatus: string, productHasOptions: boolean, pay: FeePayState | null = null): StaffExchangeActions {
  const live = isExchangeOrderStatus(orderStatus);
  const beforeReship = x.step === "requested" || x.step === "collecting" || x.step === "collected";
  const cardActive = pay !== null && pay.cardActive;
  let reshipBlocked: string | null = null;
  if (x.step === "collected") {
    if (pay?.lockReship) reshipBlocked = "카드 결제를 확인하는 중이거나 토스에서 취소된 교환비가 있어 재발송할 수 없습니다. 쇼핑몰 관리자(대표 운영사)에게 문의해 주세요.";
    else if (x.fee > 0 && x.fee_status !== "paid") reshipBlocked = "교환비 입금이 확인되면 새 상품을 보낼 수 있습니다.";
    else if (x.to_option_based && !x.to_variant_id) reshipBlocked = "바꿀 옵션이 삭제되어 재발송할 수 없습니다. 쇼핑몰 관리자에게 문의해 주세요.";
    else if (!x.to_option_based && productHasOptions) reshipBlocked = "상품에 옵션이 새로 생겨 재발송할 수 없습니다. 쇼핑몰 관리자에게 문의해 주세요.";
  }
  return {
    collecting: live && x.step === "requested",
    collected: live && (x.step === "requested" || x.step === "collecting"),
    fee: live && beforeReship && x.fee_status !== "paid" && !cardActive,
    feePaid: live && x.fee_status === "waiting" && !cardActive,
    reship: live && x.step === "collected" && reshipBlocked === null,
    done: live && x.step === "reshipped",
    reject: (x.step === "requested" || x.step === "collecting") && !cardActive,
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

/**
 * 동작 뒤 돌아갈 주소 — 입력된 주소를 받지 않고, 몰 이름 형식과 서버에서 확인한 주문 번호로 새로 만든다(QA-20261117-006).
 * 몰 이름이 형식에 안 맞으면 "/", 주문 번호가 없거나 형식이 틀리면 그 몰 첫 화면.
 */
/** 몰 이름 규칙 = DB 검사(mall_builder_stores.slug)와 같음 */
export const STORE_SLUG_RE = /^[a-z0-9][a-z0-9-]{2,29}$/;
export function exchangeReturnPath(slug: string, view: "admin" | "shop", orderId: string | null | undefined): string {
  if (typeof slug !== "string" || !STORE_SLUG_RE.test(slug) || slug.includes("--") || slug.endsWith("-")) return "/";
  if (typeof orderId !== "string" || !UUID_RE.test(orderId)) return `/s/${slug}`;
  return view === "admin" ? `/s/${slug}/admin/orders/${orderId}` : `/s/${slug}/orders/${orderId}`;
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

// ── 교환비 카드 결제(M2-12b 단계2, DB 0104 계약 37fdcabb4) ──
// 상태 판정 입력은 결제 기록의 status·needs_review 칸 값과 교환의 fee·fee_status·step뿐 — 사유 글자(error)는 직원 화면에 보여 주기만 한다.
export type FeePaymentStatus = "prepared" | "requested" | "unknown" | "done" | "failed" | "canceled";
export type FeePaymentRow = {
  exchange_id: string;
  status: FeePaymentStatus;
  needs_review: boolean;
  amount: number;
  approved_at: string | null;
  receipt_url: string;
  error: string;
  prepared_at: string | null;
  requested_at: string | null;
};
/** 결제 기록 읽기 칸 — 결제 키·멱등키 칸은 읽기 권한이 없으므로 반드시 칸을 나열한다(전체 칸 읽기는 권한 오류) */
export const FEE_PAYMENT_COLUMNS = "exchange_id, status, needs_review, amount, approved_at, receipt_url, error, prepared_at, requested_at";

export type FeePayKind = "none" | "pay" | "checking" | "hold" | "done" | "failed" | "canceled";
export type FeePayState = {
  kind: FeePayKind;
  /** 유저에게 「카드로 결제」 링크를 보여 줄지 */
  canPay: boolean;
  /** 앞 결제가 실패한 뒤 다시 결제 — 같은 토스 주문 번호를 다시 받아 주는지는 미확인(정상이라고 단정하지 않는 안내를 붙임) */
  retryUnverified: boolean;
  /** 직원 「카드 결제 다시 확인」 단추 */
  canRecheck: boolean;
  /** 재발송 잠금(확인 필요·취소 보류) */
  lockReship: boolean;
  /** 카드 결제 기록이 진행 중·완료·보류 — 금액 변경·무통장 확인·거절을 숨김 */
  cardActive: boolean;
  /** 원래 승인 기록(done)이 있는지 — 지금 잠금과 따로 표시 */
  approvalRecorded: boolean;
  customerText: string;
  staffText: string;
};

const FEE_PAYABLE_STEPS: ExchangeStep[] = ["requested", "collecting", "collected"];

export function feePayState(
  x: Pick<ExchangeRow, "fee" | "fee_status" | "step">,
  p: Pick<FeePaymentRow, "status" | "needs_review"> | null,
  cardEnabled: boolean,
): FeePayState {
  const payable = x.fee > 0 && x.fee_status === "waiting" && FEE_PAYABLE_STEPS.includes(x.step) && cardEnabled;
  const base = { canPay: false, retryUnverified: false, canRecheck: false, lockReship: false, cardActive: false, approvalRecorded: false };
  if (!p) {
    return payable
      ? { ...base, kind: "pay", canPay: true, customerText: "교환비를 카드로 결제할 수 있습니다.", staffText: "카드 결제 기록 없음(유저 결제 대기)" }
      : { ...base, kind: "none", customerText: "", staffText: "" };
  }
  switch (p.status) {
    case "prepared":
    case "requested":
    case "unknown":
      return { ...base, kind: "checking", canRecheck: true, lockReship: true, cardActive: true,
        customerText: "카드 결제를 확인하는 중입니다. 다시 결제하지 마세요 — 쇼핑몰이 확인한 뒤 안내합니다.",
        staffText: "카드 결제 확인 필요 — 「카드 결제 다시 확인」을 눌러 주세요(재발송 잠김)" };
    case "done":
      return p.needs_review
        ? { ...base, kind: "hold", canRecheck: true, lockReship: true, cardActive: true, approvalRecorded: true,
            customerText: "카드 결제를 확인하는 중입니다. 다시 결제하지 마세요 — 쇼핑몰이 확인한 뒤 안내합니다.",
            staffText: "지금 확인 필요(재발송 잠김) — 「카드 결제 다시 확인」을 눌러 주세요" }
        : { ...base, kind: "done", cardActive: true, approvalRecorded: true, customerText: "교환비 카드 결제 완료", staffText: "카드 결제 정상" };
    case "canceled":
      return { ...base, kind: "canceled", lockReship: true, cardActive: true,
        customerText: "교환비 카드 결제가 취소되어 결제되지 않은 상태입니다. 쇼핑몰에 문의해 주세요.",
        staffText: "토스에서 취소된 결제 — 유효한 결제가 아닙니다. 쇼핑몰 관리자(대표 운영사) 확인이 필요합니다(재발송·입금 확인 잠김)" };
    case "failed":
      return { ...base, kind: "failed", canPay: payable, retryUnverified: payable,
        customerText: "카드 결제가 되지 않았습니다(돈은 나가지 않았습니다).", staffText: "카드 결제 실패(돈 안 나감)" };
  }
}

/** 교환비 결제 화면 주소 — 몰 이름·주문 번호·교환 번호 형식이 맞을 때만(아니면 null) */
export function exchangePayPath(slug: string, orderId: string, exchangeId: string): string | null {
  if (typeof slug !== "string" || !STORE_SLUG_RE.test(slug) || slug.includes("--") || slug.endsWith("-")) return null;
  if (!UUID_RE.test(orderId) || !UUID_RE.test(exchangeId)) return null;
  return `/s/${slug}/orders/${orderId}/exchange-pay/${exchangeId}`;
}
/** 토스 주문 번호 — DB 0104가 고정한 값과 같아야 한다 */
export function exchangeTossOrderId(exchangeId: string): string {
  return `exfee-${exchangeId}`;
}

/** 결제창에서 돌아온 뒤 주문 상세 안내 — 주소에는 정해진 코드만(결제 키·원문 오류 0), 문구는 여기서 */
export const EXFEE_RETURN_TEXT = {
  returned: "카드 결제 결과를 받았습니다. 아래 교환 칸의 결제 상태를 확인해 주세요.",
  checking: "카드 결제를 확인하는 중입니다. 다시 결제하지 마세요 — 쇼핑몰이 확인한 뒤 안내합니다.",
  failed: "카드 결제가 되지 않았습니다(돈은 나가지 않았습니다).",
  user_canceled: "결제를 취소했습니다.",
  error: "결제 처리 중 문제가 생겼습니다. 다시 결제하지 말고 쇼핑몰에 문의해 주세요.",
} as const;
export type ExfeeReturnCode = keyof typeof EXFEE_RETURN_TEXT;
export function exfeeReturnText(code: unknown): string | null {
  return typeof code === "string" && Object.hasOwn(EXFEE_RETURN_TEXT, code) ? EXFEE_RETURN_TEXT[code as ExfeeReturnCode] : null;
}

/** 준비(prepare) 응답 → 다음 할 일. 승인(confirm)은 prepared일 때만 */
export function exfeeAfterPrepare(r: unknown): "confirm" | ExfeeReturnCode {
  const o = (r ?? {}) as { ok?: unknown; prepared?: unknown; unknown?: unknown; status?: unknown };
  // 같은 키 재진입이면 requested·unknown도 prepared: true로 오므로 상태가 정확히 prepared일 때만 승인(불확실 재진입은 승인 0)
  if (o.prepared === true && o.ok === true && o.status === "prepared") return "confirm";
  if (o.prepared === true && (o.status === "requested" || o.status === "unknown")) return "checking";
  if (o.unknown === true) return "checking";
  return "returned"; // already 등 — 표시는 주문 상세가 결제 기록을 다시 읽어 정한다(응답만으로 완료 단정 0)
}
/** 승인(confirm) 응답 → 돌아갈 안내 코드(완료여도 중립 returned) */
export function exfeeAfterConfirm(r: unknown): ExfeeReturnCode {
  const o = (r ?? {}) as { ok?: unknown; unknown?: unknown };
  if (o.unknown === true) return "checking";
  if (o.ok === true) return "returned";
  return "failed";
}
