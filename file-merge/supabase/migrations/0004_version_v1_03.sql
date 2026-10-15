-- 2026-10-15 v1.03: 엑셀 합치기 결과 다듬기 — 남길 열·순서, 같은 행 제거, 원본 바이트 보관 중단(메모리 절약). 스키마 변경 없음.
update programs set version = 'v1.03', updated_at = now() where slug = 'file-merge';
