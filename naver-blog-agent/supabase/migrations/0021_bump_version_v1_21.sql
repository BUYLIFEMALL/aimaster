-- naver-blog-agent v1.21 버전 업 및 원고 영구 저장 API 연동 마이그레이션
UPDATE public.programs
SET version = 'v1.21', updated_at = NOW()
WHERE slug = 'naver-blog-agent';
