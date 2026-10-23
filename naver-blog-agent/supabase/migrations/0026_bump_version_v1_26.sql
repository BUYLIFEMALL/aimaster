-- naver-blog-agent v1.26 버전 업: 사이드바 및 대시보드 내비게이션 작업 흐름 최적화 (네이버 계정·카테고리 메뉴를 생성 원고 보관함&발행 큐 밑으로 재배치)
UPDATE public.programs
SET version = 'v1.26', updated_at = NOW()
WHERE slug = 'naver-blog-agent';
