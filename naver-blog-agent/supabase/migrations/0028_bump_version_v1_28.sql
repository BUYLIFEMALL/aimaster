-- naver-blog-agent v1.28 버전 업: 좌측 사이드바(Sidebar.tsx) 번호형 작업 흐름(1~4) 및 API키등록·플랫폼연동 구분선 분리 표준 레이아웃 적용
UPDATE public.programs
SET version = 'v1.28', updated_at = NOW()
WHERE slug = 'naver-blog-agent';
