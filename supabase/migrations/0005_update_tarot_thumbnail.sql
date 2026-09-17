-- 타로점 프로그램 메인 썸네일 업데이트
UPDATE public.programs
SET thumbnail_url = '/images/tarot-thumbnail.png'
WHERE slug IN ('tarot-reading', 'tarot', 'tarot-reading-ai') OR name LIKE '%타로%';
