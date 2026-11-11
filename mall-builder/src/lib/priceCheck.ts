// D29 가격 점검(AI 없음, 규칙 계산) — 원가 대비 마진이 기준 아래인 판매 단가를 찾는다.
// 단가는 손님 화면·주문 DB와 같은 가격 엔진(priceLine)으로 계산한다. 원가는 상품 단위(옵션 추가금은 0으로 봄).
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { priceLine, type GradePrice, type PricingProduct, type VolumeTier } from "./pricing.ts";

export type CheckProduct = PricingProduct & { id: string; name: string; product_code: string | null; cost: number | null };
export type CheckInput = {
  products: CheckProduct[];
  grades: { id: string; name: string }[];
  gradePrices: Map<string, Map<string, GradePrice>>; // 상품 id → 등급 id → 등급가
  tiers: Map<string, VolumeTier[]>;
  customers: { id: string; label: string; base: GradePrice; byProduct: Map<string, GradePrice> }[]; // 거래처 특가(끝난 것 제외)
  minMargin: number; // %
};
export type CheckRow = {
  product_id: string;
  name: string;
  code: string | null;
  where: string; // 「판매가」「등급가(도매)」「도매 + 수량 할인(100개 이상)」「거래처 ○○ 특가」…
  price: number;
  cost: number;
  margin: number; // %
  level: "loss" | "low"; // 원가 아래 / 기준 마진 아래
};
export type CheckResult = { rows: CheckRow[]; noCost: { id: string; name: string }[]; checked: number };

export const marginOf = (price: number, cost: number) => (price <= 0 ? -100 : Math.round(((price - cost) / price) * 1000) / 10);

const has = (g: GradePrice) => !!g && (g.price != null || g.discount_rate != null);

/** 원가가 있는 상품마다: 판매가 · 등급가 · (각각에) 가장 큰 수량 할인 · 거래처 특가/기본 할인율 단가를 내고 마진을 본다 */
export function checkPrices(input: CheckInput): CheckResult {
  const rows: CheckRow[] = [];
  const noCost: CheckResult["noCost"] = [];
  let checked = 0;
  for (const p of input.products) {
    if (p.cost == null || !(p.cost > 0)) {
      noCost.push({ id: p.id, name: p.name });
      continue;
    }
    checked++;
    const cost = p.cost;
    const tiers = input.tiers.get(p.id) ?? [];
    const top = [...tiers].sort((a, b) => b.min_qty - a.min_qty)[0];
    const seen = new Map<string, number>(); // 같은 단가·같은 이름 중복 방지
    const add = (where: string, price: number) => {
      const m = marginOf(price, cost);
      if (m >= input.minMargin) return;
      const key = `${where}|${price}`;
      if (seen.has(key)) return;
      seen.set(key, price);
      rows.push({ product_id: p.id, name: p.name, code: p.product_code, where, price, cost, margin: m, level: price < cost ? "loss" : "low" });
    };
    const unit = (ctx: Parameters<typeof priceLine>[3], qty = 1) => priceLine(p, null, qty, { viewer: "business", ...ctx }).unitPrice;

    // 판매가와 그 위 수량 할인
    add("판매가", unit({}));
    if (top) add(`수량 할인(${top.min_qty}개 이상)`, unit({ tiers }, top.min_qty));
    // 등급가와 그 위 수량 할인
    for (const g of input.grades) {
      const gp = input.gradePrices.get(p.id)?.get(g.id) ?? null;
      if (!has(gp)) continue;
      add(`등급가(${g.name})`, unit({ gradePrice: gp, gradeName: g.name }));
      if (top) add(`등급가(${g.name}) + 수량 할인(${top.min_qty}개 이상)`, unit({ gradePrice: gp, gradeName: g.name, tiers }, top.min_qty));
    }
    // 거래처 특가(상품별 > 기본 할인율, 수량 할인 없음 — 가격 엔진과 같음)
    for (const c of input.customers) {
      const own = c.byProduct.get(p.id) ?? null;
      const sp = has(own) ? own : c.base;
      if (!has(sp)) continue;
      add(`거래처 ${c.label} ${has(own) ? "특가" : "기본 할인"}`, unit({ customerPrice: sp }));
    }
  }
  rows.sort((a, b) => a.margin - b.margin);
  return { rows, noCost, checked };
}
