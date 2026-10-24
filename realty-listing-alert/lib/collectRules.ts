// 수집 규칙(인수인계 §10) — 네이버 화면·응답이 바뀌면 확장 재설치 없이 이 값만 고쳐 배포한다.
// 0단계 사전 검증(PREVALIDATION_20261024.md)에서 확인한 값. 서버는 이 규칙을 내려보내기만 하고 네이버에 요청하지 않는다.
export const COLLECT_RULES = {
  version: "2026-10-25.1",
  complexUrl: "https://new.land.naver.com/complexes/{complexNo}",
  listPathIncludes: "/api/articles/complex/",
  fields: { list: "articleList", more: "isMoreData", price: "dealOrWarrantPrc", rent: "rentPrc" },
  maxPagesPerTarget: 10,
  scrollWaitMs: [2000, 5000],
  betweenTargetsMs: [10000, 30000],
  firstLoadWaitMs: 8000,
} as const;
