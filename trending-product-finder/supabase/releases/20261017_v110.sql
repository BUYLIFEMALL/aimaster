-- 2026-10-17 v1.10: 소싱 계산기 파일 분리(동작 동일, DB 구조 변경 없음)
update programs set version = 'v1.10', updated_at = now() where slug = 'trending-product-finder';
