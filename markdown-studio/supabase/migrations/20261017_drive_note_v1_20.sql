-- 2026-10-17 v1.20: Drive 칸에 메뉴 이동·새로고침 시 재연결 안내 (DB 구조 변경 없음)
update programs set version = 'v1.20', updated_at = now() where slug = 'markdown-studio';
