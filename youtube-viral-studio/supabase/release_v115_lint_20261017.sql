-- 2026-10-17 v1.15: 코드 규칙 경고 74건 → 0건 정리(동작 동일, DB 구조 변경 없음)
update programs set version = 'v1.15', updated_at = now() where slug = 'youtube-viral-studio';
