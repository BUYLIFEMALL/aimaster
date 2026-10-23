-- naver-blog-agent v1.24 버전 업: 원고 보관함&발행 큐 떡상 글감 수집소 카테고리 연계 분류 및 관리 기능 추가
UPDATE public.programs
SET version = 'v1.24', updated_at = NOW()
WHERE slug = 'naver-blog-agent';
