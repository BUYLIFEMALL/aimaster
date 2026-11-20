-- 2026-11-20 v2.01: AI 응답 형식 검사(49f136fe4), 옛 확장 ZIP v1.96 정리, 확장 버전·ZIP 함께(확장 코드 변경 없음)
update public.programs set version = 'v2.01', extension_version = 'v2.01', updated_at = now() where slug = 'tistory-auto-blog';
