// 메인 사이트 platform_guides 게시글 팝업 주소. 게시글 id는 관리자 /admin/guides 기준이다.
const BASE = "https://www.buylife.xyz/guides";
export const GUIDES = {
  gemini: `${BASE}/f442cd37-f1e0-42a7-a3de-f9a9acf47cc4`,
  openai: `${BASE}/1c5c24e2-15d4-49b8-b907-0ac6843dee3a`,
  anthropic: `${BASE}/d03f65c2-efbb-421f-a041-a075562e3b7a`,
  pexels: `${BASE}/ff6c331e-74a8-4b00-99c9-3b91f44f41f7`,
  pixabay: `${BASE}/c315c6d7-4187-446a-86da-5c37d4274d54`,
  replicate: `${BASE}/78a00b16-eef5-42be-810b-80c513d57ab4`,
  fal: `${BASE}/f5f46fea-6eb4-4886-a006-e89c486cc2f8`,
} as const;
