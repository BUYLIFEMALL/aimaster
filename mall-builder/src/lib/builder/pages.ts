// 디자인 빌더 D4 — 상품 목록·상세 화면 표시 설정 검사·읽기·정렬(node --test 대상, DB 없음)
// 표시만 바꾼다: 가격 계산·주문·쿠폰 받기·공동구매 동작은 그대로. 배송·교환·반품 안내는 법정 안내라 끌 수 없다(잠금)
// 저장: DB 0080 mall_builder_design (kind list / detail). 비어 있으면 지금 화면 그대로
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { normalizeCard, optionalImage, safeLink, type CardOptions } from "../blocks.ts";

export const LIST_SORTS = ["default", "price_asc", "price_desc", "name"] as const;
export type ListSort = (typeof LIST_SORTS)[number];
export const LIST_SORT_LABEL: Record<ListSort, string> = { default: "기본(등록·진열 순서)", price_asc: "낮은 가격 순", price_desc: "높은 가격 순", name: "이름 순" };

export type Banner = { image: string; link: string };
export type ListOverride = { category_id: string; columns?: number; sort?: ListSort; banner?: Banner };
export type ListDesign = {
  columns: number; // 큰 화면 열 수(휴대폰은 늘 2열)
  sort: ListSort;
  hide_soldout: boolean;
  card?: CardOptions;
  banner?: Banner; // 모든 카테고리 목록 위 배너
  overrides: ListOverride[]; // 카테고리별 덮어쓰기(하위 카테고리에는 물려주지 않음)
};
export type DetailDesign = {
  show_coupons: boolean;
  show_boards: boolean; // 구매 후기·상품 문의
  top_images: Banner[]; // 모든 상품 상세 위 공통 그림(3장까지)
  bottom_images: Banner[]; // 모든 상품 상세 아래 공통 그림(3장까지)
};

export const DEFAULT_LIST: ListDesign = { columns: 4, sort: "default", hide_soldout: false, overrides: [] };
export const DEFAULT_DETAIL: DetailDesign = { show_coupons: true, show_boards: true, top_images: [], bottom_images: [] };
export const MAX_OVERRIDES = 50;
export const MAX_COMMON_IMAGES = 3;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const cols = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 2 && n <= 5 ? n : null;
};
const sortOf = (v: unknown): ListSort | null => ((LIST_SORTS as readonly unknown[]).includes(v) ? (v as ListSort) : null);
type Out<T> = { ok: true; value: T } | { ok: false; error: string };

function banner(raw: unknown, where: string): Out<Banner | undefined> {
  const o = obj(raw);
  const image = optionalImage(o.image);
  if (image === null) return { ok: false, error: `${where} 그림 주소가 올바르지 않습니다(https 주소).` };
  const link = safeLink(o.link);
  if (link === null) return { ok: false, error: `${where} 링크는 /로 시작하는 이 몰 주소나 https 주소만 쓸 수 있습니다.` };
  return { ok: true, value: image ? { image, link } : undefined };
}

export function validateList(raw: unknown): Out<ListDesign> {
  const o = obj(raw);
  if (o.columns !== undefined && o.columns !== "" && cols(o.columns) === null) return { ok: false, error: "열 수는 2~5로 넣어 주세요." };
  const b = banner(o.banner, "목록 위 배너");
  if (!b.ok) return b;
  const ovs = arr(o.overrides);
  if (ovs.length > MAX_OVERRIDES) return { ok: false, error: `카테고리별 설정은 ${MAX_OVERRIDES}개까지입니다.` };
  const seen = new Set<string>();
  const overrides: ListOverride[] = [];
  for (const [i, it] of ovs.entries()) {
    const r = obj(it);
    const id = typeof r.category_id === "string" ? r.category_id.trim() : "";
    if (!UUID.test(id)) return { ok: false, error: `카테고리별 설정 ${i + 1}번째: 카테고리를 골라 주세요.` };
    if (seen.has(id)) return { ok: false, error: `카테고리별 설정 ${i + 1}번째: 같은 카테고리가 두 번 있습니다.` };
    seen.add(id);
    const ob = banner(r.banner, `카테고리별 설정 ${i + 1}번째 배너`);
    if (!ob.ok) return ob;
    const c = cols(r.columns);
    const s = sortOf(r.sort);
    overrides.push({ category_id: id, ...(c ? { columns: c } : {}), ...(s && s !== "default" ? { sort: s } : {}), ...(ob.value ? { banner: ob.value } : {}) });
  }
  const card = normalizeCard(o.card);
  return {
    ok: true,
    value: {
      columns: cols(o.columns) ?? DEFAULT_LIST.columns,
      sort: sortOf(o.sort) ?? "default",
      hide_soldout: o.hide_soldout === true,
      ...(card ? { card } : {}),
      ...(b.value ? { banner: b.value } : {}),
      overrides,
    },
  };
}

function images(raw: unknown, where: string): Out<Banner[]> {
  const list = arr(raw);
  if (list.length > MAX_COMMON_IMAGES) return { ok: false, error: `${where} 그림은 ${MAX_COMMON_IMAGES}장까지입니다.` };
  const out: Banner[] = [];
  for (const [i, it] of list.entries()) {
    const b = banner(it, `${where} ${i + 1}번째`);
    if (!b.ok) return b;
    if (!b.value) return { ok: false, error: `${where} ${i + 1}번째 그림을 올려 주세요.` };
    out.push(b.value);
  }
  return { ok: true, value: out };
}

export function validateDetail(raw: unknown): Out<DetailDesign> {
  const o = obj(raw);
  const top = images(o.top_images, "상세 위 공통");
  if (!top.ok) return top;
  const bottom = images(o.bottom_images, "상세 아래 공통");
  if (!bottom.ok) return bottom;
  return { ok: true, value: { show_coupons: o.show_coupons !== false, show_boards: o.show_boards !== false, top_images: top.value, bottom_images: bottom.value } };
}

// 읽기(그리기용) — 틀린 항목만 건너뛴다(편집 중 미리보기·옛 저장본), 저장은 위 validate*가 엄격하게
const okBanner = (it: unknown) => !!optionalImage(obj(it).image) && safeLink(obj(it).link) !== null;

export function readList(raw: unknown): ListDesign {
  const o = obj(raw);
  const seen = new Set<string>();
  const clean = {
    ...o,
    columns: cols(o.columns) ?? undefined,
    banner: okBanner(o.banner) ? o.banner : undefined,
    overrides: arr(o.overrides)
      .filter((it) => {
        const id = String(obj(it).category_id ?? "");
        if (!UUID.test(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, MAX_OVERRIDES)
      .map((it) => ({ ...obj(it), banner: okBanner(obj(it).banner) ? obj(it).banner : undefined })),
  };
  const v = validateList(clean);
  return v.ok ? v.value : DEFAULT_LIST;
}

export function readDetail(raw: unknown): DetailDesign {
  const o = obj(raw);
  const clean = { ...o, top_images: arr(o.top_images).filter(okBanner).slice(0, MAX_COMMON_IMAGES), bottom_images: arr(o.bottom_images).filter(okBanner).slice(0, MAX_COMMON_IMAGES) };
  const v = validateDetail(clean);
  return v.ok ? v.value : DEFAULT_DETAIL;
}

/** 한 카테고리 목록에 쓸 값 — 몰 기본값 위에 그 카테고리 덮어쓰기 */
export function listFor(list: ListDesign, categoryId: string): { columns: number; sort: ListSort; hide_soldout: boolean; card?: CardOptions; banner?: Banner } {
  const ov = list.overrides.find((o) => o.category_id === categoryId);
  return { columns: ov?.columns ?? list.columns, sort: ov?.sort ?? list.sort, hide_soldout: list.hide_soldout, card: list.card, banner: ov?.banner ?? list.banner };
}

type Sortable = { name: string; status?: string; display: { unitPrice: number; priceHidden: boolean } };

/** 화면에 보일 순서 — 가격은 보는 사람 기준 표시 가격, 가격 비공개 상품은 뒤로. 품절 숨기기는 표시만(상품 자체는 그대로) */
export function arrangeProducts<T extends Sortable>(list: T[], opts: { sort: ListSort; hide_soldout: boolean }): T[] {
  const shown = opts.hide_soldout ? list.filter((p) => p.status !== "sold_out") : [...list];
  if (opts.sort === "default") return shown;
  const price = (p: T) => (p.display.priceHidden ? Number.POSITIVE_INFINITY : p.display.unitPrice);
  return shown
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      if (opts.sort === "name") return a.p.name.localeCompare(b.p.name, "ko") || a.i - b.i;
      const pa = price(a.p);
      const pb = price(b.p);
      if (pa === pb) return a.i - b.i;
      if (!Number.isFinite(pa)) return 1;
      if (!Number.isFinite(pb)) return -1;
      return opts.sort === "price_asc" ? pa - pb : pb - pa;
    })
    .map((x) => x.p);
}
