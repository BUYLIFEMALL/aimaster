// threads-auto(boksajang/threads-auto, MIT, 커밋 bd2fec7) src/shared/coupang-catalog.ts에서 옮김 — 카테고리 베스트·쿠팡 PL 선택 목록.
// 쿠팡 파트너스 오픈 API 문서의 번호 그대로다. 번호가 바뀌면 여기만 고친다.

export const COUPANG_CATEGORY_OPTIONS = [
  ["1001", "여성패션"], ["1002", "남성패션"], ["1010", "뷰티"], ["1011", "출산/유아동"], ["1012", "식품"],
  ["1013", "주방용품"], ["1014", "생활용품"], ["1015", "홈인테리어"], ["1016", "가전디지털"], ["1017", "스포츠/레저"],
  ["1018", "자동차용품"], ["1019", "도서/음반/DVD"], ["1020", "완구/취미"], ["1021", "문구/오피스"], ["1024", "헬스/건강식품"],
  ["1025", "국내여행"], ["1026", "해외여행"], ["1029", "반려동물용품"], ["1030", "유아동패션"],
] as const;

export const COUPANG_PL_BRAND_OPTIONS = [
  ["1001", "탐사"], ["1002", "코멧"], ["1003", "Gomgom"], ["1004", "줌"], ["1006", "곰곰"],
  ["1007", "꼬리별"], ["1008", "베이스알파에센셜"], ["1010", "비타할로"], ["1011", "비지엔젤"],
] as const;

export type CoupangCategorySelection = "ALL" | (typeof COUPANG_CATEGORY_OPTIONS)[number][0];
export type CoupangPlSelection = "ALL" | (typeof COUPANG_PL_BRAND_OPTIONS)[number][0];

export interface CoupangProductSearchSettings {
  keywords: string;
  keywordSearchIncluded: boolean;
  goldBoxIncluded: boolean;
  categoryBestIncluded: boolean;
  categoryId: CoupangCategorySelection;
  coupangPlIncluded: boolean;
  coupangPlBrandId: CoupangPlSelection;
  rocketOnly: boolean;
  rocketFreshOnly: boolean;
}

export const DEFAULT_COUPANG_PRODUCT_SEARCH_SETTINGS: CoupangProductSearchSettings = {
  keywords: "", keywordSearchIncluded: true, goldBoxIncluded: false, categoryBestIncluded: false, categoryId: "ALL",
  coupangPlIncluded: false, coupangPlBrandId: "ALL", rocketOnly: false, rocketFreshOnly: false,
};

/** 화면에서 넘어온 값을 목록 안의 값으로만 좁힌다(목록 밖 번호는 「전체」). */
export function normalizeCoupangProductSearchSettings(config: Record<string, unknown>): CoupangProductSearchSettings {
  const categoryIds = new Set<string>(COUPANG_CATEGORY_OPTIONS.map(([id]) => id));
  const brandIds = new Set<string>(COUPANG_PL_BRAND_OPTIONS.map(([id]) => id));
  const categoryId = String(config.categoryId ?? "ALL");
  const coupangPlBrandId = String(config.coupangPlBrandId ?? "ALL");
  return {
    keywords: String(config.keywords ?? ""),
    keywordSearchIncluded: config.keywordSearchIncluded !== false,
    goldBoxIncluded: config.goldBoxIncluded === true,
    categoryBestIncluded: config.categoryBestIncluded === true,
    categoryId: (categoryId === "ALL" || categoryIds.has(categoryId) ? categoryId : "ALL") as CoupangCategorySelection,
    coupangPlIncluded: config.coupangPlIncluded === true,
    coupangPlBrandId: (coupangPlBrandId === "ALL" || brandIds.has(coupangPlBrandId) ? coupangPlBrandId : "ALL") as CoupangPlSelection,
    rocketOnly: config.rocketOnly === true,
    rocketFreshOnly: config.rocketFreshOnly === true,
  };
}

export const hasCoupangProductSource = (s: CoupangProductSearchSettings) =>
  s.keywordSearchIncluded || s.goldBoxIncluded || s.categoryBestIncluded || s.coupangPlIncluded;

/** 쉼표·줄바꿈으로 나눈 키워드(중복 제거, 최대 10개 — 원본과 같음). 검색은 키워드 1개가 쿠팡 호출 1회다. */
export function splitCoupangKeywords(value: string): string[] {
  return [...new Set(value.split(/[,\r\n]+/).map((v) => v.trim()).filter(Boolean))].slice(0, 10);
}
