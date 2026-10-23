-- STYLE DNA ANALYZER v1.04 마이그레이션
-- 원본 스크린샷 1:1 일치 3단 스튜디오 분석기 레이아웃 (스마트 스캔 오버레이, 카메라/조명 전용 카드, 도넛 팔레트, 스타일 DNA 바, 대형 일치율 96.5%)
UPDATE public.programs
SET version = 'v1.04',
    updated_at = NOW()
WHERE slug = 'style-dna-analyzer';
