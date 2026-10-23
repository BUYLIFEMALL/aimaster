-- STYLE DNA ANALYZER v1.05 마이그레이션
-- 위아래 왕복 스캔 레이저 빔 애니메이션 및 회전 Dna 인디케이터("유전자 해독 중...") 탑재
UPDATE public.programs
SET version = 'v1.05',
    updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
