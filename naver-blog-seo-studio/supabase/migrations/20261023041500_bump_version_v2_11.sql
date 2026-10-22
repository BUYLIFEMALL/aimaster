-- v2.11 (2026-10-23): 모아 둔 수정 배포 — 옛 자동 연결 코드 정리(연결 성공 뒤 안 쓰이거나 30일 미사용만 폐기). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v2.11', extension_version = 'v2.11', updated_at = now() where slug = 'naver-blog-seo-studio';
