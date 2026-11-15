// ESM+ 화면 점검 — 확장이 쓰는 구역 제목·칸 이름이 「상품등록 2.0」 화면에 그대로 있는지 「읽기만」 확인한다.
// 표는 2026-11-15 화면 분석(docs/ESM_FORM_ANALYSIS_20261115.md) 기준. fields.ts의 section·target을 바꾸면 여기도 고친다(시험이 확인).

/** 화면에 항상 있어야 하는 「구역|칸 이름」(카테고리 고르기 전 화면 기준) */
export const HEALTH_TARGETS: string[] = [
  "판매사이트|판매사이트",
  "상품명|상품명",
  "상품명|판매자 관리코드",
  "카테고리|카테고리",
  "판매가|판매가",
  "판매가|할인",
  "판매가|판매기간",
  "판매가|기간설정",
  "판매가|부가세",
  "스타배송|스타배송",
  "재고수량|G마켓",
  "재고수량|A옥션",
  "옵션|선택형",
  "상품이미지|상품이미지",
  "상품 상세설명|이미지 업로드",
  "상품 주요정보|브랜드 및 제조사",
  "상품 주요정보|브랜드 없음",
  "상품정보 제공고시|상품군",
  "배송|배송방법 선택",
  "배송|배송정보 템플릿",
  "배송|택배사",
  "배송|발송정책",
  "배송|출고지",
  "배송|묶음배송",
  "배송|배송비 선택",
  "반품/교환|반품 교환지",
  "반품/교환|반품/교환 배송비(편도)",
  "상품 추가 정보|원산지 구분",
  "노출 채널|외부제휴채널",
  "|임시저장",
  "|등록하기",
];

/** 카테고리를 골라야 나타나는 칸 — 못 봐도 실패로 세지 않는다 */
export const HEALTH_CONDITIONAL: string[] = [
  "인증정보|G마켓 인증정보",
  "인증정보|G마켓 영업허가증",
  "상품정보 제공고시|상품 상세설명 참조",
];

/** 점검을 하는 확장 최소 버전 */
export const HEALTH_EXT_MIN = "v1.01";
/** 자동 점검 간격 */
export const HEALTH_INTERVAL_DAYS = 7;

export type HealthStatus = "queued" | "running" | "ok" | "changed" | "failed";

/** 확장이 보낸 결과 정리 — 점검 표에 있는 이름만 「사라진 칸」으로 인정 */
export function normalizeHealthResult(raw: unknown): { missing: string[]; conditional: string[]; storeName: string | null } {
  const r = raw as { missing?: unknown; conditional?: unknown; storeName?: unknown } | null;
  const pick = (v: unknown, from: string[]) => [...new Set((Array.isArray(v) ? v : []).map(String).filter((x) => from.includes(x)))];
  return {
    missing: pick(r?.missing, HEALTH_TARGETS),
    conditional: pick(r?.conditional, HEALTH_CONDITIONAL),
    storeName: typeof r?.storeName === "string" && r.storeName.trim() ? r.storeName.trim().slice(0, 80) : null,
  };
}
