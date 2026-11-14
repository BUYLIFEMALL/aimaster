// 가격 계산 엔진 — 장바구니·상품 상세·주문서가 모두 이 함수를 쓴다(docs/mall/ARCHITECTURE.md §4)
// 순서: 보이기(사업자 전용·회원 구매·가격 비공개) → 판매 상태 → 기준가(판매가 + 옵션 추가금) → 등급가 → 원 단위 내림 → 최저 판매가 보호(T1) → 수량·재고 검사.
// 등급가는 DB 함수 mall_builder_price_rules_for가 「상품 예외 → 카테고리 등급율 → 등급 기본율」 순서로 정해 준다(T1, 0057).
// 수량 구간 할인·견적가는 F14·F15에서 같은 순서 자리에 끼워 넣는다. 거래처 특가(D24)는 등급가 자리에서 먼저 — 있으면 최종 단가.
// 주문 DB 함수 mall_builder_place_order가 같은 계산을 SQL로 다시 한다 — 바꾸면 둘 다 바꾼다.
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문(tsconfig allowImportingTsExtensions)
import { computeShipping, type Region, type ShippingPolicy } from "./shipping.ts";
import type { OptionGroup, Variant } from "./options.ts";

export const MAX_QTY = 999;

export type PricingProduct = {
  status: "draft" | "on_sale" | "sold_out" | "hidden";
  base_price: number;
  stock_mode: "none" | "product";
  stock: number;
  option_groups: OptionGroup[] | null;
  visibility?: "public" | "members" | "business_only"; // 없으면 공개
  price_visibility?: "all" | "login" | "approved_business"; // 없으면 모두에게 가격 공개
  moq?: number; // 최소 주문 수량(없으면 1)
  order_unit?: number; // 주문 단위(없으면 1)
  max_qty?: number | null; // 최대 수량(없으면 MAX_QTY)
};

/** 수량 구간 할인 — rate: %, amount: 개당 할인액, unit_price: 개당 가격 지정(옵션 추가금은 더함) */
export type VolumeTier = { min_qty: number; discount_type: "rate" | "amount" | "unit_price"; value: number };

/** 보는 사람 — 비로그인 / 일반(가입·로그인) / 사업자 승인 대기 / 승인 사업자 */
export type Viewer = "guest" | "consumer" | "pending" | "business";
export type GradePrice = { price: number | null; discount_rate: number | null } | null;
/** groupPrice: 진행 중인 공동구매가(D21) — 있으면 등급가·수량 할인 대신 이 가격(+ 옵션 추가금). DB 0041 v2와 같은 규칙 */
/** customerPrice: 거래처 특가(D24) — 상품별 특가 또는 거래처 기본 할인율. 있으면 등급가 대신, 최종 단가(수량 할인 안 함). DB 0045b와 같은 규칙 */
/** floorPrice: 최저 판매가(T1 — 공급사 상품의 공급가 × (1 + 최소 마진), M1-3(0069)부터 공급가 ÷ (1 − 리셀러율)과 둘 중 큰 값 — DB가 계산해 내려줌). 모든 할인 뒤에 이 아래로 내려가지 않는다(판매가+옵션을 넘지는 않음). DB 0057과 같은 규칙 */
export type PriceContext = { viewer?: Viewer; gradePrice?: GradePrice; gradeName?: string; tiers?: VolumeTier[]; groupPrice?: number | null; customerPrice?: GradePrice; floorPrice?: number | null };

export type PriceLine = {
  visible: boolean; // false면 목록·상세에 보이지 않는 상품(사업자 전용)
  priceHidden: boolean; // true면 금액 대신 안내 문구
  orderable: boolean;
  unitPrice: number;
  lineTotal: number;
  breakdown: { label: string; amount: number }[];
  errors: string[];
};

export function priceLine(product: PricingProduct, variant: Variant | null, qty: number, ctx: PriceContext = {}): PriceLine {
  const errors: string[] = [];
  const hasOptions = (product.option_groups ?? []).length > 0;
  const viewer = ctx.viewer ?? "consumer";

  // 1. 보이기 — 사업자 전용·회원 구매·가격 비공개
  const visible = product.visibility !== "business_only" || viewer === "business";
  if (!visible) errors.push("사업자 회원 전용 상품입니다.");
  else if (product.visibility === "members" && viewer === "guest") errors.push("로그인 후 구매할 수 있습니다.");
  const priceHidden =
    (product.price_visibility === "login" && viewer === "guest") || (product.price_visibility === "approved_business" && viewer !== "business");
  if (priceHidden) errors.push(product.price_visibility === "login" ? "로그인하면 가격이 보입니다." : "사업자 승인 후 가격이 공개됩니다.");

  // 판매 상태
  if (product.status === "sold_out") errors.push("품절된 상품입니다.");
  else if (product.status !== "on_sale") errors.push("지금 판매하지 않는 상품입니다.");

  // 옵션 선택
  if (hasOptions && !variant) errors.push("옵션을 선택해 주세요.");
  else if (!hasOptions && variant) errors.push("옵션이 없는 상품입니다.");
  else if (variant && !variant.is_active) errors.push("선택한 옵션은 판매하지 않습니다.");

  // 2. 기준가 → 3. 등급가 → 5. 원 단위 내림
  const extra = hasOptions && variant ? variant.extra_price : 0;
  const base = product.base_price + extra;
  let unitPrice = Math.max(0, Math.floor(base));
  const breakdown = [{ label: "판매가", amount: product.base_price }];
  if (extra) breakdown.push({ label: "옵션 추가금", amount: extra });
  const special = ctx.groupPrice == null && ctx.customerPrice && (ctx.customerPrice.price != null || ctx.customerPrice.discount_rate != null) ? ctx.customerPrice : null;
  const gp = ctx.groupPrice != null ? null : special ?? ctx.gradePrice;
  if (gp && (gp.price != null || gp.discount_rate != null)) {
    // 금액 지정은 옵션 추가금을 그대로 더하고, 할인율은 (판매가 + 추가금)에 적용
    const graded = gp.price != null ? gp.price + extra : Math.floor((base * (100 - (gp.discount_rate as number))) / 100);
    unitPrice = Math.max(0, Math.floor(graded));
    if (unitPrice !== base) breakdown.push({ label: special ? "거래처 특가" : `등급가${ctx.gradeName ? `(${ctx.gradeName})` : ""}`, amount: unitPrice - base });
  }
  // 공동구매가(D21) — 등급가·수량 할인 대신
  if (ctx.groupPrice != null) {
    unitPrice = Math.max(0, Math.floor(ctx.groupPrice + extra));
    if (unitPrice !== base) breakdown.push({ label: "공동구매가", amount: unitPrice - base });
  }
  // 4. 수량 구간 할인 — 수량 이상인 구간 중 가장 큰 구간 하나만, 등급가 다음에
  const tier = ctx.groupPrice != null || special ? undefined : (ctx.tiers ?? []).filter((t) => Number.isInteger(qty) && qty >= t.min_qty).sort((a, b) => b.min_qty - a.min_qty)[0];
  if (tier) {
    const before = unitPrice;
    if (tier.discount_type === "rate") unitPrice = Math.floor((unitPrice * (100 - tier.value)) / 100);
    else if (tier.discount_type === "amount") unitPrice = Math.max(0, unitPrice - tier.value);
    else unitPrice = Math.min(unitPrice, tier.value + extra);
    if (unitPrice !== before) breakdown.push({ label: `수량 할인(${tier.min_qty}개 이상)`, amount: unitPrice - before });
  }

  // 5-1. 최저 판매가 보호(T1) — 공급가 하한. 판매가(+옵션)를 넘기지는 않는다
  if (ctx.floorPrice != null) {
    const fl = Math.min(ctx.floorPrice, base);
    if (unitPrice < fl) {
      breakdown.push({ label: "최저 판매가 보호", amount: fl - unitPrice });
      unitPrice = fl;
    }
  }

  // 6. 수량·재고
  if (!Number.isInteger(qty) || qty < 1) errors.push("수량은 1개 이상으로 입력해 주세요.");
  else if (qty > MAX_QTY) errors.push(`한 번에 ${MAX_QTY}개까지 주문할 수 있습니다.`);
  else if (product.moq && qty < product.moq) errors.push(`최소 ${product.moq}개부터 주문할 수 있습니다.`);
  else if (product.order_unit && product.order_unit > 1 && qty % product.order_unit !== 0) errors.push(`${product.order_unit}개 단위로 주문해 주세요.`);
  else if (product.max_qty && qty > product.max_qty) errors.push(`최대 ${product.max_qty}개까지 주문할 수 있습니다.`);
  else if (product.stock_mode === "product" && product.status === "on_sale") {
    const available = hasOptions ? variant?.stock ?? null : product.stock;
    if (available != null) {
      if (available <= 0) errors.push(hasOptions ? "선택한 옵션은 품절입니다." : "품절된 상품입니다.");
      else if (qty > available) errors.push(`재고가 ${available}개 남았습니다.`);
    }
  }

  const safeQty = Number.isInteger(qty) && qty > 0 ? qty : 0;
  // 가격 비공개면 금액·근거를 내보내지 않는다
  if (priceHidden) return { visible, priceHidden, orderable: false, unitPrice: 0, lineTotal: 0, breakdown: [], errors };
  return { visible, priceHidden, orderable: errors.length === 0, unitPrice, lineTotal: unitPrice * safeQty, breakdown, errors };
}

/** 손님 정보 → 보는 사람. 승인 사업자는 사업자 등급이면서 승인 상태 */
export function viewerOf(
  customer: { approval_status: string; grade: { is_business: boolean } | null } | null,
  loggedIn: boolean,
): Viewer {
  if (!loggedIn) return "guest";
  if (!customer) return "consumer";
  if (customer.approval_status === "approved" && customer.grade?.is_business) return "business";
  if (customer.approval_status === "pending") return "pending";
  return "consumer";
}

/** 장바구니·주문서 합계 — 주문 가능한 줄만 더하고, 배송비는 정책 묶음별(shipping.ts) */
export function cartTotals(
  lines: { lineTotal: number; policyId: string | null; orderable: boolean; qty?: number; productId?: string | null }[],
  policies: ShippingPolicy[],
  region: Region = "mainland",
) {
  const ok = lines.filter((l) => l.orderable);
  if (!ok.length) return { subtotal: 0, shipping: 0, total: 0, shippingBreakdown: [] as ReturnType<typeof computeShipping>["breakdown"] };
  const subtotal = ok.reduce((s, l) => s + l.lineTotal, 0);
  const ship = computeShipping(ok.map((l) => ({ policyId: l.policyId, amount: l.lineTotal, qty: l.qty, productId: l.productId })), policies, region);
  return { subtotal, shipping: ship.total, total: subtotal + ship.total, shippingBreakdown: ship.breakdown };
}
