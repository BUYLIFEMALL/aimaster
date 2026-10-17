-- 2026-10-17 v1.11: DB 조회 장애와 빈 상태 구분 안내 (DB 구조 변경 없음)
update programs set version = 'v1.11', updated_at = now() where slug = 'trending-product-finder';
