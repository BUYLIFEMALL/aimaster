-- 2026-10-17 v1.18: 휴지통 항목별 영구 삭제·30일 안내 표시 (DB 구조 변경 없음)
update programs set version = 'v1.18', updated_at = now() where slug = 'markdown-studio';
