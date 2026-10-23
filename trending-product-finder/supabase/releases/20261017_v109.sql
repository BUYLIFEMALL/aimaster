-- 2026-10-17 v1.09: 리포트 페이지 나눔(20개씩)·키워드별 기회점수 추이 (DB 구조 변경 없음)
update programs set version = 'v1.09', updated_at = now() where slug = 'trending-product-finder';
