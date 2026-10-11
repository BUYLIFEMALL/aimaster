-- ai-webtoon-studio 카탈로그 썸네일 등록 (2026-10-11)
-- Gemini 3 Pro Image(gemini-3-pro-image-preview)로 생성된 16:9 실사 웹툰 스튜디오 썸네일
UPDATE public.programs
SET thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/ai-webtoon-studio-thumbnail.jpg?v=1791712895221'
WHERE slug = 'ai-webtoon-studio';
