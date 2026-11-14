-- E2-4 (2026-11-14, [역할: ecommerce-image] claude-win-sdp, 주인님 「진행해」): 상품소싱 「상품명·태그 초안」에서 고른 검색 태그를
-- 상세페이지 상품에 저장해 마켓 등록기(스마트스토어)가 처음 값으로 쓴다. 칸 추가만(기존 줄은 null, RLS 그대로).
alter table public.shop_products add column if not exists search_tags text[];
alter table public.shop_products drop constraint if exists shop_products_search_tags_max;
alter table public.shop_products add constraint shop_products_search_tags_max
  check (search_tags is null or coalesce(array_length(search_tags, 1), 0) <= 10);
-- 되돌리기: alter table public.shop_products drop constraint if exists shop_products_search_tags_max; alter table public.shop_products drop column if exists search_tags;
