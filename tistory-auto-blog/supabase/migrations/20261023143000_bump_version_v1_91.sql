-- v1.91 (2026-10-23): 30일 정리 회원별 기록(usage_logs cleanup_expired — 글·이미지·글감). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v1.91', extension_version = 'v1.91', updated_at = now() where slug = 'tistory-auto-blog';
