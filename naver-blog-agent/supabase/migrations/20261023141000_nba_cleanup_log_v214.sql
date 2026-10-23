-- v2.14 (2026-10-23): 30일 정리 회원별 기록(usage_logs cleanup_expired — 원고·AI 이미지·글감·비공개 사진). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v2.14', extension_version = 'v2.14', updated_at = now() where slug = 'naver-blog-agent';
