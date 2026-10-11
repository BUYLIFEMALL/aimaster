-- CARDNEWS STUDIO 전용 카탈로그 썸네일 (2026-10-11): scripts/generate-program-thumbnail.mjs (Gemini 3 Pro Image, 관리자 키 사용 확인 후) →
-- Storage program-images/catalog/cardnews-studio-thumbnail.jpg → programs.thumbnail_url
UPDATE public.programs
SET thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/cardnews-studio-thumbnail.jpg?v=1791711618466',
    updated_at = NOW()
WHERE slug = 'cardnews-studio';
