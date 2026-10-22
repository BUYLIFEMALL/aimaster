-- v1.90 (2026-10-23): 글 품질 보완(글감의 구체 사실 살려 쓰기 지시·문단별 최소 글자 수·소제목과 같은 작은 제목 제거),
-- 모아 둔 옛 자동 연결 코드 정리(연결 성공 뒤, 안 쓰이거나 30일 미사용만) 함께 배포. 확장 코드 변경 없음(버전만).
update public.programs set version = 'v1.90', extension_version = 'v1.90', updated_at = now() where slug = 'tistory-auto-blog';
