-- v1.14 (2026-10-23): 30일 정리 회원별 기록(usage_logs cleanup_expired — 항목·이미지 작업·이미지 파일).
update public.programs set version = 'v1.14', updated_at = now() where slug = 'blog-workroom';
