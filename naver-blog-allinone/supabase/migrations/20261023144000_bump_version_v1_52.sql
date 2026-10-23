-- v1.52 (2026-10-23): 30일 정리 회원별 기록(usage_logs cleanup_expired — 글·이미지). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v1.52', extension_version = 'v1.52', updated_at = now() where slug = 'naver-blog-allinone';
