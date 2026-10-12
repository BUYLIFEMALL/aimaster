-- STYLE DNA ANALYZER v1.06 마이그레이션
-- 흰색 베이스 고가독성 스튜디오 테마 (Clean White Studio) 기본 적용 및 가독성 개선
UPDATE public.programs
SET version = 'v1.06',
    updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
