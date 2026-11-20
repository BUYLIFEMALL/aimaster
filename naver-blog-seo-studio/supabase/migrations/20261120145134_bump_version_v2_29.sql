-- 2026-11-20 v2.29: 발행 결과 확인 대상 제목·대시보드 확장 사용 기록, 확장 코드 변경 포함
update public.programs set version = 'v2.29', extension_version = 'v2.29', updated_at = now() where slug = 'naver-blog-seo-studio';
