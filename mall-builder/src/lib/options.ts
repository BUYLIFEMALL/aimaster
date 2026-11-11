// 상품 옵션(최대 3단 조합) — 예: 색상[빨강, 파랑] × 사이즈[S, M] → 4개 조합
// DB: mall_builder_products.option_groups(jsonb) + mall_builder_product_variants(조합별 추가금·재고·품번·사용 여부)

export type OptionGroup = { name: string; values: string[] };

export type Variant = {
  key: string; // 값들을 " / "로 이은 것 — 조합을 찾는 열쇠
  values: string[];
  extra_price: number;
  stock: number;
  sku: string;
  is_active: boolean;
};

export const MAX_GROUPS = 3;
export const MAX_VALUES = 50;
export const MAX_VARIANTS = 300;

export const variantKey = (values: string[]) => values.join(" / ");

/** "빨강, 파랑,파랑 , " → ["빨강","파랑"] (앞뒤 공백 제거·빈칸·중복 제거) */
export function splitValues(input: string): string[] {
  return [...new Set(input.split(",").map((v) => v.trim()).filter(Boolean))];
}

export function validateGroups(groups: OptionGroup[]): string | null {
  if (groups.length > MAX_GROUPS) return `옵션은 ${MAX_GROUPS}단까지 만들 수 있습니다.`;
  const names = new Set<string>();
  for (const g of groups) {
    const name = g.name.trim();
    if (name.length < 1 || name.length > 20) return "옵션 이름은 1~20자로 입력해 주세요.";
    if (names.has(name)) return `옵션 이름 「${name}」이(가) 겹칩니다.`;
    names.add(name);
    if (g.values.length < 1) return `「${name}」에 값을 하나 이상 넣어 주세요.`;
    if (g.values.length > MAX_VALUES) return `「${name}」 값은 ${MAX_VALUES}개까지입니다.`;
    if (g.values.some((v) => v.length > 30)) return `「${name}」 값은 30자 이내로 입력해 주세요.`;
    if (g.values.some((v) => v.includes(" / "))) return "옵션 값에 「 / 」는 쓸 수 없습니다.";
  }
  const total = groups.reduce((n, g) => n * g.values.length, groups.length ? 1 : 0);
  if (total > MAX_VARIANTS) return `옵션 조합이 ${total}개입니다. ${MAX_VARIANTS}개 이하로 줄여 주세요.`;
  return null;
}

/** 옵션 묶음으로 조합 목록을 만든다. 이미 있던 조합(같은 값)의 추가금·재고·품번·사용 여부는 그대로 둔다 */
export function buildVariants(groups: OptionGroup[], existing: Variant[] = []): Variant[] {
  if (!groups.length) return [];
  const old = new Map(existing.map((v) => [v.key, v]));
  let combos: string[][] = [[]];
  for (const g of groups) combos = combos.flatMap((c) => g.values.map((v) => [...c, v]));
  return combos.map((values) => {
    const key = variantKey(values);
    const prev = old.get(key);
    return prev ? { ...prev, values } : { key, values, extra_price: 0, stock: 0, sku: "", is_active: true };
  });
}

/** 손님이 고를 수 있는 조합 — 사용 중이고, 재고 관리 시 재고가 있는 것 */
export function isVariantOrderable(v: Variant, stockByOption: boolean): boolean {
  return v.is_active && (!stockByOption || v.stock > 0);
}

/** 조합 입력값 검사(추가금은 음수 가능 — 예: 작은 사이즈 -1,000원) */
export function validateVariant(v: { extra_price: number; stock: number; sku: string }, basePrice: number): string | null {
  if (!Number.isInteger(v.extra_price)) return "추가금은 원 단위 정수로 입력해 주세요.";
  if (basePrice + v.extra_price < 0) return "판매가 + 추가금이 0원보다 작을 수 없습니다.";
  if (!Number.isInteger(v.stock) || v.stock < 0 || v.stock > 1_000_000) return "재고는 0 이상 정수로 입력해 주세요.";
  if (v.sku.length > 50) return "품번은 50자 이내로 입력해 주세요.";
  return null;
}
