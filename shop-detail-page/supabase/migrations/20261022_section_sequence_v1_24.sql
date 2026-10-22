-- v1.24: 상품별 섹션 순서(회원이 「↑」「↓」로 바꾼 순서, 비어 있으면 템플릿 기본 순서).
-- 칸 추가만 — 기존 행·데이터 영향 없음. shop_products의 기존 RLS(본인 행만)가 그대로 적용된다.
-- 되돌리기: alter table public.shop_products drop column if exists section_sequence;
alter table public.shop_products add column if not exists section_sequence text[];

update public.programs set version = 'v1.24', updated_at = now() where slug = 'shop-detail-page';

select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'shop_products' and column_name = 'section_sequence';
select slug, version from public.programs where slug = 'shop-detail-page';
