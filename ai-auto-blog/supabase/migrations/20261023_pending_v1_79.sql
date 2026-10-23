-- v1.79 (2026-10-23): 모아 둔 두 가지 배포 — 옛 자동 연결 코드 정리(연결 성공 뒤 안 쓰이거나 30일 미사용만 폐기), 소제목 반복 제거(지시문 1줄 + dropRepeatedHeading). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v1.79', extension_version = 'v1.79', updated_at = now() where slug = 'ai-auto-blog';
