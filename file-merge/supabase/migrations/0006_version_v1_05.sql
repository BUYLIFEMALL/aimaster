-- 2026-10-15 v1.05: 엑셀 나누기에도 원본 서식 유지(시트별·열 값별·N행씩). 스키마 변경 없음.
update programs set version = 'v1.05', updated_at = now() where slug = 'file-merge';
