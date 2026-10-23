-- 2026-10-17 v1.16: 최근 문서 더 보기·백업에 고정/꼬리표 포함·꼬리표 이름 (DB 구조 변경 없음)
update programs set version = 'v1.16', updated_at = now() where slug = 'markdown-studio';
