-- 타로점 프로그램 이름 업데이트
UPDATE public.programs
SET name = 'AIMaster 타로점'
WHERE slug IN ('tarot-reading', 'tarot', 'tarot-reading-ai') OR name LIKE '%타로%';
