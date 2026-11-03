// 가격 계산 엔진 기본판 — 장바구니·상품 상세·주문서가 모두 이 함수를 쓴다(docs/mall/ARCHITECTURE.md §4)
// 지금 단계: 판매 상태 → 기준가(판매가 + 옵션 추가금) → 원 단위 내림 → 수량·재고 검사.
// 등급가·수량 구간 할인·견적가·가격 비공개는 B2B 묶음(F12~F15)에서 같은 순서 자리에 끼워 넣는다.
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
};

export type PriceLine = {
  orderable: boolean;
  unitPrice: number;
  lineTotal: number;
  breakdown: { label: string; amount: number }[];
  errors: string[];
};

export function priceLine(product: PricingProduct, variant: Variant | null, qty: number): PriceLine {
  const errors: string[] = [];
  const hasOptions = (product.option_groups ?? []).length > 0;

  // 1. 판매 상태
  if (product.status === "sold_out") errors.push("품절된 상품입니다.");
  else if (product.status !== "on_sale") errors.push("지금 판매하지 않는 상품입니다.");

  // 옵션 선택
  if (hasOptions && !variant) errors.push("옵션을 선택해 주세요.");
  else if (!hasOptions && variant) errors.push("옵션이 없는 상품입니다.");
  else if (variant && !variant.is_active) errors.push("선택한 옵션은 판매하지 않습니다.");

  // 2. 기준가 → 5. 원 단위 내림
  const extra = hasOptions && variant ? variant.extra_price : 0;
  const unitPrice = Math.max(0, Math.floor(product.base_price + extra));
  const breakdown = [{ label: "판매가", amount: product.base_price }];
  if (extra) breakdown.push({ label: "옵션 추가금", amount: extra });

  // 6. 수량·재고
  if (!Number.isInteger(qty) || qty < 1) errors.push("수량은 1개 이상으로 입력해 주세요.");
  else if (qty > MAX_QTY) errors.push(`한 번에 ${MAX_QTY}개까지 주문할 수 있습니다.`);
  else if (product.stock_mode === "product" && product.status === "on_sale") {
    const available = hasOptions ? variant?.stock ?? null : product.stock;
    if (available != null) {
      if (available <= 0) errors.push(hasOptions ? "선택한 옵션은 품절입니다." : "품절된 상품입니다.");
      else if (qty > available) errors.push(`재고가 ${available}개 남았습니다.`);
    }
  }

  const safeQty = Number.isInteger(qty) && qty > 0 ? qty : 0;
  return { orderable: errors.length === 0, unitPrice, lineTotal: unitPrice * safeQty, breakdown, errors };
}

/** 장바구니·주문서 합계 — 주문 가능한 줄만 더하고, 배송비는 정책 묶음별(shipping.ts) */
export function cartTotals(
  lines: { lineTotal: number; policyId: string | null; orderable: boolean }[],
  policies: ShippingPolicy[],
  region: Region = "mainland",
) {
  const ok = lines.filter((l) => l.orderable);
  if (!ok.length) return { subtotal: 0, shipping: 0, total: 0, shippingBreakdown: [] as ReturnType<typeof computeShipping>["breakdown"] };
  const subtotal = ok.reduce((s, l) => s + l.lineTotal, 0);
  const ship = computeShipping(ok.map((l) => ({ policyId: l.policyId, amount: l.lineTotal })), policies, region);
  return { subtotal, shipping: ship.total, total: subtotal + ship.total, shippingBreakdown: ship.breakdown };
}
