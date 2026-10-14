-- 2026-10-15 v1.02: 엑셀 처리를 백그라운드(Web Worker)로 — 20만 행 화면 멈춤 제거, 큰 행 수 스택 넘침 수정. 스키마 변경 없음. FREE 배지는 주인님 결정으로 달지 않음(유료 유지).
update programs set version = 'v1.02', updated_at = now() where slug = 'file-merge';
