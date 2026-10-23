-- STYLE DNA ANALYZER 전용 카탈로그 썸네일 (2026-10-11): scripts/generate-program-thumbnail.mjs (Gemini 3 Pro Image, 관리자 키 사용은 주인님 요청으로 확인) →
-- Storage program-images/catalog/style-dna-analyzer-thumbnail.jpg → programs.thumbnail_url
UPDATE public.programs
SET thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/style-dna-analyzer-thumbnail.jpg?v=1791716681280',
    updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
