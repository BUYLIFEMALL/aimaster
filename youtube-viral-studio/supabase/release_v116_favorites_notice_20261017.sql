-- 2026-10-17 v1.16: 보관함 1,000개 도달 안내(A안, DB 구조 변경 없음)
update programs set version = 'v1.16', updated_at = now() where slug = 'youtube-viral-studio';
