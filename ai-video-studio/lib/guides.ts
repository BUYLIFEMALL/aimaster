// 메인 사이트 platform_guides 게시글(관리자 /admin/guides) — 설정 화면 하단 「연동 매뉴얼」 팝업에 쓴다.
const BASE = "https://www.buylife.xyz/guides";
export const GUIDE_LINKS: { label: string; url: string }[] = [
  { label: "Google Gemini API 키 발급받기", url: `${BASE}/f442cd37-f1e0-42a7-a3de-f9a9acf47cc4` },
  { label: "fal.ai API 키 발급받기", url: `${BASE}/f5f46fea-6eb4-4886-a006-e89c486cc2f8` },
  { label: "Replicate API 토큰 발급받기", url: `${BASE}/78a00b16-eef5-42be-810b-80c513d57ab4` },
];
