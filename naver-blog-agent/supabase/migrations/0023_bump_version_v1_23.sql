-- naver-blog-agent v1.23 버전 업 및 대시보드 빠른 작업 떡상 글감 수집소 좌측 배치 마이그레이션
UPDATE public.programs
SET version = 'v1.23', updated_at = NOW()
WHERE slug = 'naver-blog-agent';
