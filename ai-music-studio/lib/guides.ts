// 메인 사이트 platform_guides 게시글(관리자 /admin/guides) — 설정 화면 하단 「연동 매뉴얼」 팝업에 쓴다.
const BASE = "https://www.buylife.xyz/guides";
export const GUIDE_LINKS: { label: string; url: string }[] = [
  { label: "Google Gemini API 키 발급받기", url: `${BASE}/f442cd37-f1e0-42a7-a3de-f9a9acf47cc4` },
  { label: "ElevenLabs API 키 발급받기", url: `${BASE}/9457687a-75ed-40d8-bc4a-9415173eba70` },
  { label: "SUNO(수노) API 연동하기", url: `${BASE}/0ecb9a3c-e4f7-4229-8fc3-f74fdb6dc6fd` },
  { label: "fal.ai API 키 발급받기", url: `${BASE}/f5f46fea-6eb4-4886-a006-e89c486cc2f8` },
  { label: "Replicate API 토큰 발급받기", url: `${BASE}/78a00b16-eef5-42be-810b-80c513d57ab4` },
  { label: "OpenAI API 키 발급받기(가사 쓰기 선택)", url: `${BASE}/1c5c24e2-15d4-49b8-b907-0ac6843dee3a` },
];
