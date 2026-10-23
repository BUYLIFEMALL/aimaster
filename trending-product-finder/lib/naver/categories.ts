// 네이버 데이터랩 쇼핑인사이트 대분류 카테고리 코드(cid).
// 참고: https://developers.naver.com/docs/serviceapi/datalab/shopping/shopping.md
// 정확한 전체 목록은 네이버쇼핑에서 카테고리 선택 시 URL의 cat_id 값으로 재검증 가능하다.
export const NAVER_TOP_CATEGORIES: Array<{ name: string; code: string }> = [
  { name: "패션의류", code: "50000000" },
  { name: "화장품/미용", code: "50000002" },
  { name: "디지털/가전", code: "50000003" },
  { name: "가구/인테리어", code: "50000004" },
  { name: "출산/육아", code: "50000005" },
  { name: "식품", code: "50000006" },
  { name: "스포츠/레저", code: "50000007" },
  { name: "생활/건강", code: "50000008" },
  { name: "여가/생활편의", code: "50000009" },
  { name: "면세점", code: "50000010" },
  { name: "패션잡화", code: "50000001" },
];
