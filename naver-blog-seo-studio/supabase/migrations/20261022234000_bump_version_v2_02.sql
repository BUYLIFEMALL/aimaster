-- v2.02 (2026-10-22): BLC-11 키워드 도구(blog-keyword) 기록을 번호로 넘겨받아 실측·AI 추정·값 없음을 나눠 보여 주는 카드(GET /api/keyword-handoff/[reportId], 읽기만). 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v2.02', extension_version = 'v2.02', updated_at = now() where slug = 'naver-blog-seo-studio';
