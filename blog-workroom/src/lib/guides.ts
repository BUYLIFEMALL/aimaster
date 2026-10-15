// 메인 사이트 platform_guides 게시글 팝업 주소. 게시글 id는 관리자 /admin/guides 기준이다.
const BASE = "https://www.buylife.xyz/guides";
export const GUIDES = {
  openai: `${BASE}/1c5c24e2-15d4-49b8-b907-0ac6843dee3a`,
  gemini: `${BASE}/f442cd37-f1e0-42a7-a3de-f9a9acf47cc4`,
  naverSearch: `${BASE}/8f201233-b2f6-4da0-851c-f045bdb5f9c7`,
  naverAds: `${BASE}/8be38787-dacf-4921-9800-83159c9001be`,
} as const;
