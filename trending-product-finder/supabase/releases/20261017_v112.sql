-- 2026-10-17 v1.12: 운영 의존성 보안 경고 0건(Next 내부 postcss 8.5.26 고정, DB 구조 변경 없음)
update programs set version = 'v1.12', updated_at = now() where slug = 'trending-product-finder';
