// 쿠팡 카테고리 추천·메타정보(C1-7·C1-8). 응답 정리는 외부 호출 없이 시험한다(tests/category.test.mjs).
// 추천: https://developers.coupang.com/ko/api/categories/category-recommendation
// 메타: https://developers.coupang.com/ko/api/categories/category-metadata-query
// ⚠️ 메타의 attributes에 고를 수 있는 값 목록(inputValues)이 오는지는 문서에 없어 실제 응답으로 확인한다.

// 찾아보기: /ko/api/categories/how-to-get-categories(2026-10-31 확인). 0은 1단계, 응답은 바로 아래 한 단계만 준다
export const browsePath = (code: number) => `/v2/providers/seller_api/apis/api/v1/marketplace/meta/display-categories/${code}`;
export type CategoryNode = { code: number; name: string };
/** 서비스 중(ACTIVE)인 하위 카테고리만. 없으면 맨 아래 카테고리다 */
export function normalizeBrowse(raw: unknown): CategoryNode[] {
  const child = (raw as { data?: { child?: unknown } })?.data?.child;
  return (Array.isArray(child) ? (child as Record<string, unknown>[]) : [])
    .filter((c) => c.status === "ACTIVE" && Number(c.displayItemCategoryCode) > 0)
    .map((c) => ({ code: Number(c.displayItemCategoryCode), name: String(c.name ?? "") }));
}

export const PREDICT_PATH = "/v2/providers/openapi/apis/api/v1/categorization/predict";
export const metaPath = (categoryCode: number | string) =>
  `/v2/providers/seller_api/apis/api/v1/marketplace/meta/category-related-metas/display-category-codes/${encodeURIComponent(String(categoryCode))}`;

export type PredictResult =
  | { ok: true; code: number; name: string }
  | { ok: false; reason: "FAILURE" | "INSUFFICIENT_INFORMATION" | "EMPTY"; comment: string };

export function predictBody(input: { name: string; description?: string; brand?: string; sku?: string }) {
  return {
    productName: input.name.trim(),
    ...(input.description?.trim() ? { productDescription: input.description.trim().slice(0, 2000) } : {}),
    ...(input.brand?.trim() ? { brand: input.brand.trim() } : {}),
    ...(input.sku?.trim() ? { sellerSkuCode: input.sku.trim() } : {}),
  };
}

export function normalizePredict(json: unknown): PredictResult {
  const d = ((json ?? {}) as { data?: { autoCategorizationPredictionResultType?: string; predictedCategoryId?: unknown; predictedCategoryName?: unknown; comment?: unknown } }).data ?? {};
  const code = Number(d.predictedCategoryId);
  if (d.autoCategorizationPredictionResultType === "SUCCESS" && Number.isInteger(code) && code > 0) {
    return { ok: true, code, name: String(d.predictedCategoryName ?? "").trim() };
  }
  const t = d.autoCategorizationPredictionResultType;
  return { ok: false, reason: t === "FAILURE" || t === "INSUFFICIENT_INFORMATION" ? t : "EMPTY", comment: String(d.comment ?? "").trim() };
}

export interface CategoryAttribute {
  name: string;
  dataType: string;
  required: boolean;
  /** true = 구매옵션(옵션 칸), false = 검색옵션 */
  purchase: boolean;
  basicUnit: string;
  units: string[];
  group: string | null;
  /** SELECT = 쿠팡 목록에서 고름, 그 밖(INPUT 등) = 직접 입력 — 2026-10-29 실응답 확인 */
  inputType: string;
  /** 고를 수 있는 값(inputValues, 글자 목록) */
  values: string[];
}

export interface CategoryMeta {
  singleAllowed: boolean;
  attributes: CategoryAttribute[];
  notices: { category: string; details: { name: string; required: boolean }[] }[];
  documents: { name: string; required: string }[];
  certifications: { type: string; name: string; required: string; needsCode: boolean }[];
  offerConditions: string[];
}

const s = (v: unknown) => (v == null ? "" : String(v)).trim();

export function normalizeMeta(json: unknown): CategoryMeta {
  const d = ((json ?? {}) as { data?: Record<string, unknown> }).data ?? {};
  const arr = (v: unknown) => (Array.isArray(v) ? v : []) as Record<string, unknown>[];
  return {
    singleAllowed: d.isAllowSingleItem !== false,
    attributes: arr(d.attributes)
      .map((a) => ({
        name: s(a.attributeTypeName),
        dataType: s(a.dataType) || "STRING",
        required: a.required === "MANDATORY",
        purchase: a.exposed === "EXPOSED",
        basicUnit: s(a.basicUnit),
        units: (Array.isArray(a.usableUnits) ? a.usableUnits : []).map(s).filter(Boolean),
        group: s(a.groupNumber) && s(a.groupNumber) !== "NONE" ? s(a.groupNumber) : null,
        inputType: s(a.inputType) || "INPUT",
        values: (Array.isArray(a.inputValues) ? a.inputValues : []).map(s).filter(Boolean),
      }))
      .filter((a) => a.name),
    notices: arr(d.noticeCategories)
      .map((n) => ({
        category: s(n.noticeCategoryName),
        details: arr(n.noticeCategoryDetailNames).map((x) => ({ name: s(x.noticeCategoryDetailName), required: x.required === "MANDATORY" })).filter((x) => x.name),
      }))
      .filter((n) => n.category),
    documents: arr(d.requiredDocumentNames).map((x) => ({ name: s(x.templateName), required: s(x.required) })).filter((x) => x.name),
    certifications: arr(d.certifications)
      .map((c) => ({ type: s(c.certificationType), name: s(c.name), required: s(c.required), needsCode: c.dataType === "CODE" }))
      .filter((c) => c.type),
    offerConditions: (Array.isArray(d.allowedOfferConditions) ? d.allowedOfferConditions : []).map(s).filter(Boolean),
  };
}

/** 고시정보: 고른 상품군의 모든 항목을 채운다(회원이 넣은 값 우선, 없으면 「상세페이지 참조」). */
export const NOTICE_FILLER = "상세페이지 참조";
export function fillNotices(meta: CategoryMeta, category: string | null, values: Record<string, string> = {}) {
  const group = meta.notices.find((n) => n.category === category) ?? meta.notices[0];
  if (!group) return [];
  return group.details.map((d) => ({ category: group.category, detail: d.name, content: (values[d.name] ?? "").trim() || NOTICE_FILLER }));
}

/** 보내기 전에 회원이 알아야 할 필수 항목(구매옵션 필수·구비서류 필수·인증 필수) */
export function metaWarnings(meta: CategoryMeta, usedPurchaseNames: string[]): string[] {
  const w: string[] = [];
  const used = new Set(usedPurchaseNames);
  for (const a of meta.attributes) if (a.purchase && a.required && !used.has(a.name)) w.push(`필수 구매옵션 「${a.name}」이 옵션에 없습니다.`);
  for (const d of meta.documents) if (d.required === "MANDATORY") w.push(`이 카테고리는 구비서류 「${d.name}」가 필요합니다.`);
  for (const c of meta.certifications) if (c.required === "MANDATORY") w.push(`이 카테고리는 인증 「${c.name}」 정보가 필요합니다.`);
  if (meta.offerConditions.length && !meta.offerConditions.includes("NEW")) w.push("이 카테고리는 새 상품 등록을 받지 않습니다.");
  return w;
}
