-- D28 첫 화면 「구매 후기」 블록 — 몰 전체 최근 후기(읽기 전용, 2026-11-11)
-- 함수 하나를 추가만 한다. 지금 지워지는 데이터는 없다.
-- 상품별 후기 함수(mall_builder_product_reviews)와 같은 규칙: 이름 가림(mall_builder_mask_name), 숨김·지운 후기 제외,
-- 보는 사람이 볼 수 있는 상품만(mall_builder_product_visible — 사업자 전용·폐쇄몰·판매 상태). 글은 200자까지만.

create or replace function public.mall_builder_store_recent_reviews(p_store_id uuid, p_limit integer default 6, p_min_rating integer default 1)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
    select r.id, r.rating, left(r.body, 200) as body, r.created_at,
           public.mall_builder_mask_name(c.name) as author,
           p.id as product_id, p.name as product_name
      from public.mall_builder_reviews r
      join public.mall_builder_products p on p.id = r.product_id
      join public.mall_builder_stores s on s.id = r.store_id and s.status = 'active'
      join public.mall_builder_store_customers c on c.id = r.customer_id
     where r.store_id = p_store_id and not r.is_hidden and not r.is_deleted
       and r.rating >= greatest(1, least(coalesce(p_min_rating, 1), 5))
       and public.mall_builder_product_visible(p.id)
     order by r.created_at desc
     limit greatest(1, least(coalesce(p_limit, 6), 12))
  ) x
$$;
