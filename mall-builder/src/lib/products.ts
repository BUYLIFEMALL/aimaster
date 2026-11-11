// 상품 기본 정보 — 입력값 검사·표시용 계산. DB: mall_builder_products(+ _private 원가, _categories 연결)

export const PRODUCT_STATUS = {
  draft: "준비 중",
  on_sale: "판매 중",
  sold_out: "품절",
  hidden: "숨김",
} as const;
export type ProductStatus = keyof typeof PRODUCT_STATUS;

export const MAX_IMAGES = 5;

export type ProductImage = { url: string; path: string };

export type ProductInput = {
  name: string;
  summary: string;
  description: string;
  base_price: number;
  list_price: number | null;
  cost: number | null;
  tax_type: "taxable" | "exempt";
  status: ProductStatus;
  stock_mode: "none" | "product"; // 「product」 + 옵션이 있으면 옵션별 재고(옵션 조합 표의 stock)
  stock: number;
  images: ProductImage[];
  category_ids: string[];
  shipping_policy_id: string | null; // 없으면 몰 기본 배송비 정책
  visibility: "public" | "members" | "business_only";
  price_visibility: "all" | "login" | "approved_business";
  moq: number; // 최소 주문 수량
  order_unit: number; // 주문 단위
  max_qty: number | null; // 최대 수량(없으면 제한 없음 — 999)
};

export const MAX_TIERS = 3;

/** 수량 구간 할인 칸: "5%" → 할인율, "-1000" → 개당 1,000원 할인, "40000" → 개당 가격 지정 */
export function parseTierValue(input: unknown): { ok: true; value: { discount_type: "rate" | "amount" | "unit_price"; value: number } } | { ok: false; error: string } {
  const s = String(input ?? "").replace(/[,\s원]/g, "");
  const rate = s.match(/^(\d{1,2})%$/);
  if (rate) {
    const n = Number(rate[1]);
    if (n < 1 || n > 99) return { ok: false, error: "구간 할인율은 1~99%로 입력해 주세요." };
    return { ok: true, value: { discount_type: "rate", value: n } };
  }
  const minus = s.match(/^-(\d+)$/);
  if (minus) return Number(minus[1]) > 0 ? { ok: true, value: { discount_type: "amount", value: Number(minus[1]) } } : { ok: false, error: "할인액은 1원 이상으로 입력해 주세요." };
  if (/^\d+$/.test(s) && Number(s) <= MAX_PRICE) return { ok: true, value: { discount_type: "unit_price", value: Number(s) } };
  return { ok: false, error: "구간 할인은 5%(할인율)·-1000(개당 할인)·40000(개당 가격)처럼 입력해 주세요." };
}

/** 구간 행들(최소 수량 + 할인 칸) → 정리된 목록. 빈 행은 건너뛰고, 최소 수량은 2 이상·겹치지 않게 */
export function parseTiers(rows: { min_qty: unknown; value: unknown }[]): { ok: true; value: { min_qty: number; discount_type: "rate" | "amount" | "unit_price"; value: number }[] } | { ok: false; error: string } {
  const out: { min_qty: number; discount_type: "rate" | "amount" | "unit_price"; value: number }[] = [];
  for (const r of rows) {
    const q = String(r.min_qty ?? "").trim();
    const val = String(r.value ?? "").trim();
    if (!q && !val) continue;
    if (!/^\d+$/.test(q) || Number(q) < 2 || Number(q) > 999) return { ok: false, error: "구간 최소 수량은 2~999로 입력해 주세요." };
    const parsed = parseTierValue(val);
    if (!parsed.ok) return parsed;
    if (out.some((t) => t.min_qty === Number(q))) return { ok: false, error: "같은 최소 수량 구간이 두 번 있습니다." };
    out.push({ min_qty: Number(q), ...parsed.value });
  }
  return { ok: true, value: out.sort((a, b) => a.min_qty - b.min_qty) };
}

export const VISIBILITY_LABEL = { public: "모두에게 보임", members: "보이지만 로그인해야 구매", business_only: "승인 사업자에게만 보임" } as const;
export const PRICE_VISIBILITY_LABEL = { all: "모두에게 가격 공개", login: "로그인하면 가격 공개", approved_business: "승인 사업자에게만 가격 공개" } as const;

/** 등급가 칸: "8000"·"8,000원" → 금액, "15%" → 할인율(1~99), 빈칸 → 없음(기본 판매가) */
export function parseGradePrice(input: unknown): { ok: true; value: { price: number | null; discount_rate: number | null } | null } | { ok: false; error: string } {
  const s = String(input ?? "").replace(/[,\s원]/g, "");
  if (s === "") return { ok: true, value: null };
  const rate = s.match(/^(\d{1,2})%$/);
  if (rate) {
    const n = Number(rate[1]);
    if (n < 1 || n > 99) return { ok: false, error: "할인율은 1~99%로 입력해 주세요." };
    return { ok: true, value: { price: null, discount_rate: n } };
  }
  if (!/^\d+$/.test(s)) return { ok: false, error: "등급가는 금액(예: 8000) 또는 할인율(예: 15%)로 입력해 주세요." };
  const n = Number(s);
  if (n > MAX_PRICE) return { ok: false, error: "등급가가 너무 큽니다." };
  return { ok: true, value: { price: n, discount_rate: null } };
}

export type ProductErrors = Partial<Record<keyof ProductInput, string>>;

/** "12,000" 같은 입력을 정수로. 비었으면 null, 숫자가 아니면 NaN */
export function parseWon(input: unknown): number | null {
  const s = String(input ?? "").replace(/[,\s원]/g, "");
  if (s === "") return null;
  if (!/^\d+$/.test(s)) return Number.NaN;
  return Number(s);
}

export function formatWon(n: number | null | undefined): string {
  return n == null ? "" : `${n.toLocaleString("ko-KR")}원`;
}

/** 정가 대비 할인율(%) — 정가가 없거나 판매가 이하가 아니면 0 */
export function discountRate(basePrice: number, listPrice: number | null): number {
  if (!listPrice || listPrice <= basePrice) return 0;
  return Math.floor(((listPrice - basePrice) / listPrice) * 100);
}

const MAX_PRICE = 1_000_000_000; // 10억 원

function readImages(raw: unknown): ProductImage[] | null {
  if (raw == null) return []; // 사진 없이 저장
  try {
    const list = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
    if (!Array.isArray(list)) return null;
    return list
      .filter((i) => i && typeof i.url === "string" && typeof i.path === "string")
      .map((i) => ({ url: i.url, path: i.path }));
  } catch {
    return null;
  }
}

/** 폼 값 → 저장값. storeId를 주면 사진 경로가 그 몰 폴더인지 확인한다 */
export function validateProduct(input: Record<string, unknown>, storeId?: string): { ok: true; value: ProductInput } | { ok: false; errors: ProductErrors } {
  const errors: ProductErrors = {};
  const name = String(input.name ?? "").trim();
  const summary = String(input.summary ?? "").trim();
  const description = String(input.description ?? "").trim();
  if (name.length < 1 || name.length > 100) errors.name = "상품 이름은 1~100자로 입력해 주세요.";
  if (summary.length > 200) errors.summary = "한 줄 소개는 200자 이내로 입력해 주세요.";
  if (description.length > 20000) errors.description = "상세 설명은 20,000자 이내로 입력해 주세요.";

  const base = parseWon(input.base_price);
  if (base == null || Number.isNaN(base)) errors.base_price = "판매가를 숫자로 입력해 주세요.";
  else if (base > MAX_PRICE) errors.base_price = "판매가가 너무 큽니다.";

  const list = parseWon(input.list_price);
  if (list != null && Number.isNaN(list)) errors.list_price = "정가는 숫자로 입력해 주세요.";
  else if (list != null && base != null && !Number.isNaN(base) && list < base) errors.list_price = "정가는 판매가보다 작을 수 없습니다(할인 표시용).";

  const cost = parseWon(input.cost);
  if (cost != null && Number.isNaN(cost)) errors.cost = "원가는 숫자로 입력해 주세요.";

  const tax_type = input.tax_type === "exempt" ? "exempt" : "taxable";
  const status = (Object.keys(PRODUCT_STATUS) as ProductStatus[]).includes(input.status as ProductStatus)
    ? (input.status as ProductStatus)
    : "draft";
  const stock_mode = input.stock_mode === "product" ? "product" : "none";
  const stockRaw = parseWon(input.stock);
  let stock = 0;
  if (stock_mode === "product") {
    if (stockRaw == null || Number.isNaN(stockRaw)) errors.stock = "재고 수량을 숫자로 입력해 주세요.";
    else if (stockRaw > 1_000_000) errors.stock = "재고 수량이 너무 큽니다.";
    else stock = stockRaw;
  }

  const images = readImages(input.images);
  if (images == null) errors.images = "사진 정보를 읽지 못했습니다. 다시 올려 주세요.";
  else if (images.length > MAX_IMAGES) errors.images = `사진은 ${MAX_IMAGES}장까지 올릴 수 있습니다.`;
  else if (storeId && images.some((i) => !i.path.startsWith(`${storeId}/`))) errors.images = "이 몰의 사진만 쓸 수 있습니다.";

  const category_ids = [...new Set((Array.isArray(input.category_ids) ? input.category_ids : []).map(String))].filter((id) =>
    /^[0-9a-f-]{36}$/.test(id),
  );

  const sp = String(input.shipping_policy_id ?? "");
  const shipping_policy_id = /^[0-9a-f-]{36}$/.test(sp) ? sp : null;
  const visibility = (Object.keys(VISIBILITY_LABEL) as ProductInput["visibility"][]).includes(input.visibility as ProductInput["visibility"])
    ? (input.visibility as ProductInput["visibility"])
    : "public";
  const price_visibility = (Object.keys(PRICE_VISIBILITY_LABEL) as ProductInput["price_visibility"][]).includes(
    input.price_visibility as ProductInput["price_visibility"],
  )
    ? (input.price_visibility as ProductInput["price_visibility"])
    : "all";

  const qtyField = (key: "moq" | "order_unit" | "max_qty", label: string, fallback: number | null) => {
    const n = parseWon(input[key]);
    if (n == null) return fallback;
    if (Number.isNaN(n) || n < 1 || n > 999) {
      errors[key] = `${label}은(는) 1~999로 입력해 주세요.`;
      return fallback;
    }
    return n;
  };
  const moq = qtyField("moq", "최소 주문 수량", 1) as number;
  const order_unit = qtyField("order_unit", "주문 단위", 1) as number;
  const max_qty = qtyField("max_qty", "최대 수량", null);
  if (max_qty != null && max_qty < moq) errors.max_qty = "최대 수량은 최소 주문 수량보다 작을 수 없습니다.";
  if (order_unit > 1 && moq % order_unit !== 0) errors.moq = "최소 주문 수량은 주문 단위의 배수로 입력해 주세요.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name, summary, description,
      base_price: base as number, list_price: list, cost,
      tax_type, status, stock_mode, stock,
      images: images ?? [], category_ids, shipping_policy_id,
      visibility, price_visibility,
      moq, order_unit, max_qty,
    },
  };
}
