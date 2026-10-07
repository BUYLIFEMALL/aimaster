-- naver-blog-agent v1.17: AI 글 생성 엔진 선택(GPT, Claude, Gemini) 및 멀티 AI 이미지 생성 엔진(NanoBanana, GPT Image, FLUX 2.0, Z-Image) 탑재 & 갤러리/다운로드 연동
UPDATE public.programs
SET version = 'v1.17',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
