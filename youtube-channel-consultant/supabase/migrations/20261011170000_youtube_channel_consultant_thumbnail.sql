-- YOUTUBE CHANNEL CONSULTANT 전용 카탈로그 썸네일 (2026-10-11)
-- scripts/generate-program-thumbnail.mjs 로 Gemini(gemini-3-pro-image-preview)로 생성해
-- Supabase Storage program-images/catalog/youtube-channel-consultant-thumbnail.jpg 에 올리고 아래 값으로 반영했다.
UPDATE public.programs
SET thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/youtube-channel-consultant-thumbnail.jpg?v=1791704083479',
    updated_at = NOW()
WHERE slug = 'youtube-channel-consultant';
