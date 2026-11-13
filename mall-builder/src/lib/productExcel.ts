// D23 상품 엑셀 대량 등록·수정 — 엑셀 행 ↔ 상품 저장값 변환·검사·비교(엑셀 도구와 분리, node --test 대상)
// 결정(주인님 2026-11-10 「추천안 5가지 그대로」): 품번으로 상품을 알아봄 · 오류가 하나라도 있으면 적용 막음 ·
// 옵션 시트에 그 상품 행이 있으면 옵션을 엑셀 내용으로 교체(같은 조합은 유지) · 없는 카테고리 경로는 오류.
// 검사는 화면 저장과 같은 함수(validateProduct·parseGradePrice·parseTiers·validateGroups·validateVariant)를 쓴다.

import { categoryPath, type CategoryRow } from "./categories.ts";
import { buildVariants, validateGroups, validateVariant, variantKey, type OptionGroup, type Variant } from "./options.ts";
import {
  MAX_TIERS,
  PRODUCT_STATUS,
  parseGradePrice,
  parseTiers,
  validateProduct,
  type ProductErrors,
  type ProductImage,
  type ProductInput,
} from "./products.ts";

export const MAX_EXCEL_ROWS = 1000;
export const PRODUCT_CODE_RE = /^[A-Za-z0-9_-]{1,40}$/;

// ── 칸 이름(엑셀 머리글) ─────────────────────────────────────────
export const SHEET = { products: "상품", options: "옵션", tiers: "구간 할인" } as const;

const P_COLS = [
  ["code", "품번", "필수. 영문·숫자·-·_ 40자 이내. 이미 있는 품번이면 그 상품을 고칩니다", "P00001"],
  ["name", "상품명", "필수. 100자 이내", "무선 마우스"],
  ["summary", "한 줄 소개", "200자 이내", "조용한 클릭"],
  ["base_price", "판매가", "필수. 원 단위 숫자", "12000"],
  ["list_price", "정가", "할인 표시용. 판매가 이상", "15000"],
  ["cost", "원가", "운영자만 봄", "7000"],
  ["tax", "과세", "과세 / 면세 (비우면 과세)", "과세"],
  ["status", "상태", "판매 중 / 준비 중 / 품절 / 숨김 (비우면 준비 중)", "판매 중"],
  ["stock_mode", "재고 관리", "관리 안 함 / 수량 관리 (옵션이 있으면 옵션별 재고)", "수량 관리"],
  ["stock", "재고", "재고 관리가 「수량 관리」면 필수", "100"],
  ["categories", "카테고리", "경로를 >로, 여러 개는 ;로. 예: 식품>과일;선물", "컴퓨터>주변기기"],
  ["shipping", "배송비 정책", "정책 이름. 비우면 몰 기본", ""],
  ["visibility", "공개 범위", "전체 / 로그인 구매 / 사업자 전용 (비우면 전체)", "전체"],
  ["price_visibility", "가격 공개", "공개 / 로그인 / 사업자 (비우면 공개)", "공개"],
  ["moq", "최소 주문 수량", "1~999", "1"],
  ["order_unit", "주문 단위", "1~999", "1"],
  ["max_qty", "최대 수량", "비우면 제한 없음", ""],
] as const;
const IMAGES_COL = ["images", "사진 주소", "이 몰에 올린 사진 주소만, ;로 최대 5개(새 사진은 화면에서 올림)", ""] as const;
const DESC_COL = ["description", "상세 설명", "20,000자 이내", ""] as const;
const DETAIL_COL = ["detail_images", "상세 그림", "이 몰에 올린 사진 주소만, ;로 최대 40개(상세 설명 아래 세로로 보임)", ""] as const;
export const GRADE_PREFIX = "등급가:";

export const O_COLS = [
  ["code", "상품 품번"],
  ["n1", "옵션1 이름"], ["v1", "옵션1 값"],
  ["n2", "옵션2 이름"], ["v2", "옵션2 값"],
  ["n3", "옵션3 이름"], ["v3", "옵션3 값"],
  ["extra", "추가금"], ["stock", "재고"], ["sku", "조합 품번"], ["active", "사용"],
] as const;
export const T_COLS = [
  ["code", "상품 품번"], ["min_qty", "시작 수량"], ["value", "할인"],
] as const;

const TAX = { 과세: "taxable", 면세: "exempt" } as const;
const STOCK = { "관리 안 함": "none", "수량 관리": "product" } as const;
const VIS = { 전체: "public", "로그인 구매": "members", "사업자 전용": "business_only" } as const;
const PRICE_VIS = { 공개: "all", 로그인: "login", 사업자: "approved_business" } as const;
const STATUS = Object.fromEntries(Object.entries(PRODUCT_STATUS).map(([k, v]) => [v, k])) as Record<string, ProductInput["status"]>;

const squash = (s: string) => s.replace(/\s+/g, "");
/** 한글 선택값 읽기 — 띄어쓰기는 무시. 비우면 기본값, 모르는 값이면 null */
function pick<T extends string>(table: Record<string, T>, raw: string, fallback: T): T | null {
  const s = squash(raw);
  if (!s) return fallback;
  for (const [label, key] of Object.entries(table)) if (squash(label) === s) return key;
  return null;
}
const labelOf = <T extends string>(table: Record<string, T>, key: T) => Object.entries(table).find(([, k]) => k === key)?.[0] ?? "";
const choices = (table: Record<string, string>) => Object.keys(table).join(" / ");

// ── 형식 ─────────────────────────────────────────────────────
export type Row = Record<string, string> & { __row: string };
export type Sheets = { products: Row[]; options: Row[]; tiers: Row[] };

export type GradeValue = { price: number | null; discount_rate: number | null };
export type Tier = { min_qty: number; discount_type: "rate" | "amount" | "unit_price"; value: number };

export type ExistingProduct = Omit<ProductInput, "cost" | "category_ids"> & {
  id: string;
  product_code: string | null;
  cost: number | null;
  category_ids: string[];
  option_groups: OptionGroup[];
  variants: (Variant & { id?: string })[];
  grades: Record<string, GradeValue>; // 등급 id → 값
  tiers: Tier[];
};

export type ExcelContext = {
  storeId: string;
  publicBase: string; // …/storage/v1/object/public/mall-builder-public
  categories: CategoryRow[];
  policies: { id: string; name: string }[];
  grades: { id: string; name: string }[];
  existing: ExistingProduct[];
};

export type PlannedProduct = {
  row: number;
  code: string;
  name: string;
  action: "create" | "update" | "same" | "error";
  errors: string[];
  changes: string[];
  id: string | null;
  value?: {
    product: Omit<ProductInput, "cost" | "category_ids"> & { product_code: string };
    cost: number | null;
    category_ids: string[];
    grades: Record<string, GradeValue | null>; // null = 지움
    tiers: Tier[] | null; // null = 건드리지 않음
    options: { groups: OptionGroup[]; variants: Variant[] } | null; // null = 건드리지 않음
  };
};

export type ExcelPlan = {
  products: PlannedProduct[];
  sheetErrors: string[]; // 행에 붙일 수 없는 오류(시트·머리글·옵션/구간 행)
  counts: { create: number; update: number; same: number; error: number };
};

// ── 헬퍼 ─────────────────────────────────────────────────────
export function headersFor(grades: { name: string }[]): string[] {
  return [...P_COLS.map((c) => c[1]), ...grades.map((g) => GRADE_PREFIX + g.name), IMAGES_COL[1], DESC_COL[1], DETAIL_COL[1]];
}
export const HELP_MARK = "※"; // 설명 줄은 첫 칸이 이 글자로 시작 → 읽을 때 건너뜀
/** 양식 둘째 줄(설명 + 예시) — 첫 칸이 ※라 올릴 때 건너뛴다 */
export function helpRow(grades: { name: string }[]): string[] {
  const cells = [
    ...P_COLS.map((c) => (c[3] ? `${c[2]} (예: ${c[3]})` : c[2])),
    ...grades.map(() => "금액(8000) 또는 할인율(10%), 비우면 판매가"),
    IMAGES_COL[2],
    DESC_COL[2],
    DETAIL_COL[2],
  ];
  cells[0] = `${HELP_MARK} ${cells[0]} — 이 줄은 설명이라 올릴 때 건너뜁니다`;
  return cells;
}

export function categoryPathLabel(rows: CategoryRow[], id: string): string {
  return categoryPath(rows, id).map((c) => c.name.trim()).join(">");
}
const normPath = (s: string) => s.split(">").map((p) => p.trim()).filter(Boolean).join(">");

/** 사진 주소 → {url, path}. 이 몰 공개 폴더 주소가 아니면 null */
export function imageFromUrl(url: string, publicBase: string, storeId: string): ProductImage | null {
  const prefix = publicBase.replace(/\/+$/, "") + "/";
  if (!url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  if (!path.startsWith(`${storeId}/`) || path.includes("..") || /[?#]/.test(path)) return null;
  return { url, path };
}

const FIELD_LABEL: Record<keyof ProductInput, string> = {
  name: "상품명", summary: "한 줄 소개", description: "상세 설명", base_price: "판매가", list_price: "정가", cost: "원가",
  tax_type: "과세", status: "상태", stock_mode: "재고 관리", stock: "재고", images: "사진 주소", detail_images: "상세 그림", category_ids: "카테고리",
  shipping_policy_id: "배송비 정책", visibility: "공개 범위", price_visibility: "가격 공개", moq: "최소 주문 수량",
  order_unit: "주문 단위", max_qty: "최대 수량",
};

/** 지금 상품에 품번이 없으면 매길 번호(P00001부터, 이미 쓰는 번호는 건너뜀) */
export function assignCodes(existing: { id: string; product_code: string | null }[]): { id: string; code: string }[] {
  const used = new Set(existing.map((p) => p.product_code?.toUpperCase()).filter(Boolean));
  let n = 1;
  const out: { id: string; code: string }[] = [];
  for (const p of existing) {
    if (p.product_code) continue;
    let code: string;
    do code = `P${String(n++).padStart(5, "0")}`;
    while (used.has(code));
    used.add(code);
    out.push({ id: p.id, code });
  }
  return out;
}

// ── 읽기: 엑셀 행 → 저장 계획 ────────────────────────────────
export function planImport(sheets: Sheets, ctx: ExcelContext): ExcelPlan {
  const sheetErrors: string[] = [];
  const byCode = new Map(ctx.existing.filter((p) => p.product_code).map((p) => [p.product_code!.toUpperCase(), p]));
  const catByPath = new Map(ctx.categories.map((c) => [categoryPathLabel(ctx.categories, c.id), c.id]));
  const policyByName = new Map(ctx.policies.map((p) => [p.name.trim(), p.id]));

  if (!sheets.products.length) sheetErrors.push(`「${SHEET.products}」 시트에 상품 행이 없습니다.`);
  if (sheets.products.length > MAX_EXCEL_ROWS) sheetErrors.push(`한 번에 ${MAX_EXCEL_ROWS}개까지 올릴 수 있습니다(지금 ${sheets.products.length}개).`);

  // 품번 중복(시트 안)
  const seen = new Map<string, number>();
  for (const r of sheets.products) {
    const c = String(r.code ?? "").trim().toUpperCase();
    if (c) seen.set(c, (seen.get(c) ?? 0) + 1);
  }

  // 옵션·구간 행을 품번별로 모음
  const optionRows = groupByCode(sheets.options);
  const tierRows = groupByCode(sheets.tiers);
  const productCodes = new Set(sheets.products.map((r) => String(r.code ?? "").trim().toUpperCase()).filter(Boolean));
  for (const [code, rows] of optionRows) if (!productCodes.has(code)) sheetErrors.push(`「${SHEET.options}」 ${rows[0].__row}행: 상품 시트에 없는 품번 「${rows[0].code}」입니다.`);
  for (const [code, rows] of tierRows) if (!productCodes.has(code)) sheetErrors.push(`「${SHEET.tiers}」 ${rows[0].__row}행: 상품 시트에 없는 품번 「${rows[0].code}」입니다.`);

  const products: PlannedProduct[] = sheets.products.map((r) => {
    const errors: string[] = [];
    const code = String(r.code ?? "").trim();
    const name = String(r.name ?? "").trim();
    const row = Number(r.__row);
    if (!code) errors.push("품번이 비어 있습니다.");
    else if (!PRODUCT_CODE_RE.test(code)) errors.push("품번은 영문·숫자·-·_ 40자 이내로 입력해 주세요.");
    else if ((seen.get(code.toUpperCase()) ?? 0) > 1) errors.push(`품번 「${code}」이(가) 이 파일에 두 번 이상 있습니다.`);
    const existing = code ? byCode.get(code.toUpperCase()) ?? null : null;

    // 선택값
    const tax_type = pick(TAX, r.tax ?? "", "taxable");
    if (!tax_type) errors.push(`과세: ${choices(TAX)} 중 하나로 입력해 주세요.`);
    const status = pick(STATUS, r.status ?? "", "draft");
    if (!status) errors.push(`상태: ${choices(STATUS)} 중 하나로 입력해 주세요.`);
    const stock_mode = pick(STOCK, r.stock_mode ?? "", "none");
    if (!stock_mode) errors.push(`재고 관리: ${choices(STOCK)} 중 하나로 입력해 주세요.`);
    const visibility = pick(VIS, r.visibility ?? "", "public");
    if (!visibility) errors.push(`공개 범위: ${choices(VIS)} 중 하나로 입력해 주세요.`);
    const price_visibility = pick(PRICE_VIS, r.price_visibility ?? "", "all");
    if (!price_visibility) errors.push(`가격 공개: ${choices(PRICE_VIS)} 중 하나로 입력해 주세요.`);

    // 카테고리 경로
    const category_ids: string[] = [];
    for (const part of String(r.categories ?? "").split(";").map(normPath).filter(Boolean)) {
      const id = catByPath.get(part);
      if (id) category_ids.push(id);
      else errors.push(`카테고리 「${part}」이(가) 없습니다. 카테고리 메뉴에서 먼저 만들거나 경로를 확인해 주세요.`);
    }

    // 배송비 정책
    let shipping_policy_id: string | null = null;
    const sp = String(r.shipping ?? "").trim();
    if (sp) {
      shipping_policy_id = policyByName.get(sp) ?? null;
      if (!shipping_policy_id) errors.push(`배송비 정책 「${sp}」이(가) 없습니다.`);
    }

    // 사진
    const images: ProductImage[] = [];
    for (const url of String(r.images ?? "").split(";").map((s) => s.trim()).filter(Boolean)) {
      const img = imageFromUrl(url, ctx.publicBase, ctx.storeId);
      if (img) images.push(img);
      else errors.push("사진 주소는 이 몰에 올린 사진만 쓸 수 있습니다(새 사진은 상품 화면에서 올려 주세요).");
    }
    const detail_images: ProductImage[] = [];
    for (const url of String(r.detail_images ?? "").split(";").map((s) => s.trim()).filter(Boolean)) {
      const img = imageFromUrl(url, ctx.publicBase, ctx.storeId);
      if (img) detail_images.push(img);
      else errors.push("상세 그림 주소는 이 몰에 올린 사진만 쓸 수 있습니다(새 사진은 상품 화면에서 올려 주세요).");
    }

    // 옵션이 있는 상품은 재고를 옵션별로 관리하므로, 상품 재고 칸을 비워도 0으로 본다
    const hasOptionRows = optionRows.has(code.toUpperCase());
    const stockCell = !String(r.stock ?? "").trim() && hasOptionRows ? "0" : r.stock;
    const checked = validateProduct(
      {
        name, summary: r.summary, description: r.description, base_price: r.base_price, list_price: r.list_price, cost: r.cost,
        tax_type, status, stock_mode, stock: stockCell, images: JSON.stringify(images), detail_images: JSON.stringify(detail_images), category_ids,
        shipping_policy_id: shipping_policy_id ?? "", visibility, price_visibility, moq: r.moq, order_unit: r.order_unit, max_qty: r.max_qty,
      },
      ctx.storeId,
    );
    if (!checked.ok) for (const [k, msg] of Object.entries(checked.errors as ProductErrors)) errors.push(`${FIELD_LABEL[k as keyof ProductInput]}: ${msg}`);

    // 등급가
    const grades: Record<string, GradeValue | null> = {};
    for (const g of ctx.grades) {
      const parsed = parseGradePrice(r[GRADE_PREFIX + g.name] ?? "");
      if (!parsed.ok) errors.push(`${GRADE_PREFIX}${g.name}: ${parsed.error}`);
      else grades[g.id] = parsed.value;
    }

    // 구간 할인(그 품번 행이 있을 때만)
    let tiers: Tier[] | null = null;
    const tRows = tierRows.get(code.toUpperCase());
    if (tRows) {
      if (tRows.length > MAX_TIERS) errors.push(`구간 할인은 상품마다 ${MAX_TIERS}개까지입니다(${tRows.length}개).`);
      const parsed = parseTiers(tRows.map((t) => ({ min_qty: t.min_qty, value: t.value })));
      if (!parsed.ok) errors.push(`구간 할인: ${parsed.error}`);
      else tiers = parsed.value;
    }

    // 옵션(그 품번 행이 있을 때만)
    let options: { groups: OptionGroup[]; variants: Variant[] } | null = null;
    const oRows = optionRows.get(code.toUpperCase());
    if (oRows && checked.ok) {
      const built = planOptions(oRows, checked.value.base_price, existing?.variants ?? []);
      if ("error" in built) errors.push(`옵션: ${built.error}`);
      else options = built;
    }

    if (errors.length || !checked.ok) return { row, code, name, action: "error" as const, errors, changes: [], id: existing?.id ?? null };

    const { cost, category_ids: cats, ...rest } = checked.value;
    const product = { ...rest, product_code: code };
    const value = { product, cost, category_ids: cats, grades, tiers, options };
    if (!existing) return { row, code, name, action: "create" as const, errors, changes: [], id: null, value };
    const changes = diffProduct(existing, value, ctx);
    return { row, code, name, action: changes.length ? ("update" as const) : ("same" as const), errors, changes, id: existing.id, value };
  });

  const counts = { create: 0, update: 0, same: 0, error: 0 };
  for (const p of products) counts[p.action]++;
  return { products, sheetErrors, counts };
}

function groupByCode(rows: Row[]): Map<string, Row[]> {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    const c = String(r.code ?? "").trim().toUpperCase();
    if (!c) continue;
    m.set(c, [...(m.get(c) ?? []), r]);
  }
  return m;
}

/** 옵션 행 → 옵션 묶음 + 조합. 행에 없는 조합은 「사용 안 함」(재고 0) */
export function planOptions(rows: Row[], basePrice: number, existing: Variant[]): { groups: OptionGroup[]; variants: Variant[] } | { error: string } {
  const names = (r: Row) => [r.n1, r.n2, r.n3].map((s) => String(s ?? "").trim());
  const first = names(rows[0]);
  const count = first.findIndex((n) => !n) === -1 ? 3 : first.findIndex((n) => !n);
  if (count === 0) return { error: `${rows[0].__row}행: 옵션1 이름이 비어 있습니다.` };
  const groups: OptionGroup[] = first.slice(0, count).map((name) => ({ name, values: [] }));
  const sent = new Map<string, Row>();
  for (const r of rows) {
    const ns = names(r);
    if (ns.slice(0, count).join("|") !== first.slice(0, count).join("|") || ns.slice(count).some(Boolean))
      return { error: `${r.__row}행: 같은 상품의 옵션 이름은 모든 행이 같아야 합니다(${first.slice(0, count).join(", ")}).` };
    const vals = [r.v1, r.v2, r.v3].slice(0, count).map((s) => String(s ?? "").trim());
    if (vals.some((v) => !v)) return { error: `${r.__row}행: 옵션 값이 비어 있습니다.` };
    vals.forEach((v, i) => { if (!groups[i].values.includes(v)) groups[i].values.push(v); });
    const key = variantKey(vals);
    if (sent.has(key)) return { error: `${r.__row}행: 「${key}」 조합이 두 번 있습니다.` };
    sent.set(key, r);
  }
  const gErr = validateGroups(groups);
  if (gErr) return { error: gErr };

  const variants = buildVariants(groups, existing).map((v) => {
    const r = sent.get(v.key);
    if (!r) return { ...v, is_active: false, stock: existing.some((e) => e.key === v.key) ? v.stock : 0 };
    const num = (s: string, d: number) => {
      const t = String(s ?? "").replace(/[,\s원]/g, "");
      return t === "" ? d : /^-?\d+$/.test(t) ? Number(t) : Number.NaN;
    };
    const active = squash(String(r.active ?? ""));
    return {
      ...v,
      extra_price: num(r.extra, 0),
      stock: num(r.stock, 0),
      sku: String(r.sku ?? "").trim(),
      is_active: active === "" || active === "사용" || active.toUpperCase() === "Y",
    };
  });
  for (const v of variants) {
    if (Number.isNaN(v.extra_price) || Number.isNaN(v.stock)) return { error: `「${v.key}」: 추가금·재고는 숫자로 입력해 주세요.` };
    const err = validateVariant(v, basePrice);
    if (err) return { error: `「${v.key}」: ${err}` };
  }
  return { groups, variants };
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** 지금 상품과 엑셀 값 비교 → 바뀐 칸 이름 목록 */
export function diffProduct(cur: ExistingProduct, next: NonNullable<PlannedProduct["value"]>, ctx: ExcelContext): string[] {
  const out: string[] = [];
  const p = next.product;
  const scalar: (keyof ProductInput)[] = ["name", "summary", "description", "base_price", "list_price", "tax_type", "status", "stock_mode", "stock", "shipping_policy_id", "visibility", "price_visibility", "moq", "order_unit", "max_qty"];
  // 글자 칸은 줄바꿈 모양(화면 저장 \r\n ↔ 엑셀 \n)이 달라도 같은 값으로 본다
  const norm = (x: unknown) => (typeof x === "string" ? x.replace(/\r\n?/g, "\n") : x);
  for (const k of scalar) if (norm((cur as Record<string, unknown>)[k]) !== norm((p as Record<string, unknown>)[k])) out.push(FIELD_LABEL[k]);
  if (cur.product_code !== p.product_code) out.push("품번");
  if (cur.cost !== next.cost) out.push("원가");
  if (!sameJson(cur.images.map((i) => i.path), p.images.map((i) => i.path))) out.push("사진 주소");
  if (!sameJson((cur.detail_images ?? []).map((i) => i.path), p.detail_images.map((i) => i.path))) out.push("상세 그림");
  if (!sameJson([...cur.category_ids].sort(), [...next.category_ids].sort())) out.push("카테고리");
  for (const g of ctx.grades) {
    const a = cur.grades[g.id] ?? null;
    const b = next.grades[g.id] ?? null;
    if (!sameJson(a, b)) out.push(GRADE_PREFIX + g.name);
  }
  if (next.tiers && !sameJson(cur.tiers, next.tiers)) out.push("구간 할인");
  if (next.options) {
    const pickV = (v: Variant) => [v.key, v.extra_price, v.stock, v.sku, v.is_active];
    if (!sameJson(cur.option_groups, next.options.groups) || !sameJson(cur.variants.map(pickV), next.options.variants.map(pickV))) out.push("옵션");
  }
  return out;
}

// ── 쓰기: 지금 상품 → 엑셀 행(내려받기) ──────────────────────
export function exportRows(ctx: ExcelContext): { products: string[][]; options: string[][]; tiers: string[][] } {
  const policyName = new Map(ctx.policies.map((p) => [p.id, p.name]));
  const won = (n: number | null) => (n == null ? "" : String(n));
  const products = ctx.existing.map((p) => [
    p.product_code ?? "", p.name, p.summary, won(p.base_price), won(p.list_price), won(p.cost),
    labelOf(TAX, p.tax_type), PRODUCT_STATUS[p.status], labelOf(STOCK, p.stock_mode), p.stock_mode === "product" ? String(p.stock) : "",
    p.category_ids.map((id) => categoryPathLabel(ctx.categories, id)).join(";"),
    p.shipping_policy_id ? policyName.get(p.shipping_policy_id) ?? "" : "",
    labelOf(VIS, p.visibility), labelOf(PRICE_VIS, p.price_visibility),
    String(p.moq), String(p.order_unit), won(p.max_qty),
    ...ctx.grades.map((g) => {
      const v = p.grades[g.id];
      return !v ? "" : v.discount_rate != null ? `${v.discount_rate}%` : won(v.price);
    }),
    p.images.map((i) => i.url).join(";"),
    p.description,
    (p.detail_images ?? []).map((i) => i.url).join(";"),
  ]);
  const options = ctx.existing.flatMap((p) =>
    p.variants.map((v) => {
      const cells = p.option_groups.flatMap((g, i) => [g.name, v.values[i] ?? ""]);
      while (cells.length < 6) cells.push("");
      return [p.product_code ?? "", ...cells, String(v.extra_price), String(v.stock), v.sku, v.is_active ? "사용" : "안 함"];
    }),
  );
  const tierText = (t: Tier) => (t.discount_type === "rate" ? `${t.value}%` : t.discount_type === "amount" ? `-${t.value}` : String(t.value));
  const tiers = ctx.existing.flatMap((p) => p.tiers.map((t) => [p.product_code ?? "", String(t.min_qty), tierText(t)]));
  return { products, options, tiers };
}

/** 머리글 줄 → 칸 열쇠 지도(모르는 머리글은 무시, 필수 머리글이 없으면 오류) */
export function mapHeaders(sheet: "products" | "options" | "tiers", header: string[], grades: { id: string; name: string }[]): { keys: (string | null)[] } | { error: string } {
  const defs: [string, string][] =
    sheet === "products"
      ? [...P_COLS.map((c) => [c[0], c[1]] as [string, string]), [IMAGES_COL[0], IMAGES_COL[1]], [DESC_COL[0], DESC_COL[1]], [DETAIL_COL[0], DETAIL_COL[1]], ...grades.map((g) => [GRADE_PREFIX + g.name, GRADE_PREFIX + g.name] as [string, string])]
      : sheet === "options"
        ? O_COLS.map((c) => [c[0], c[1]] as [string, string])
        : T_COLS.map((c) => [c[0], c[1]] as [string, string]);
  const byLabel = new Map(defs.map(([k, l]) => [squash(l), k]));
  const keys = header.map((h) => byLabel.get(squash(String(h ?? ""))) ?? null);
  const need = sheet === "products" ? ["code", "name", "base_price"] : sheet === "options" ? ["code", "n1", "v1"] : ["code", "min_qty", "value"];
  const missing = need.filter((k) => !keys.includes(k));
  if (missing.length) {
    const label = (k: string) => defs.find(([key]) => key === k)?.[1] ?? k;
    return { error: `「${SHEET[sheet]}」 시트 첫 줄에 ${missing.map(label).join(", ")} 칸이 없습니다. 양식을 내려받아 사용해 주세요.` };
  }
  return { keys };
}

/** 표(2차원 글자 배열, 첫 줄 머리글) → 행 목록. 빈 줄·설명 줄(※)은 건너뜀. __row는 엑셀 줄 번호 */
export function tableToRows(table: string[][], keys: (string | null)[], firstRow = 1): Row[] {
  const out: Row[] = [];
  table.slice(1).forEach((cells, i) => {
    if (!cells.some((c) => String(c ?? "").trim())) return;
    if (String(cells[0] ?? "").trim().startsWith(HELP_MARK)) return;
    const r = { __row: String(firstRow + 1 + i) } as Row;
    keys.forEach((k, j) => { if (k) r[k] = String(cells[j] ?? "").trim(); });
    out.push(r);
  });
  return out;
}
