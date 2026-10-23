-- naver-blog-agent v1.22 버전 업 및 운영 대시보드 메뉴 최상단 배치 마이그레이션
UPDATE public.programs
SET version = 'v1.22', updated_at = NOW()
WHERE slug = 'naver-blog-agent';
