-- D25 빠른 주문 — 품번·조합 품번으로 상품·옵션 찾기(읽기 전용, 2026-11-10)
-- 함수 하나를 추가만 한다. 지금 지워지는 데이터는 없다.
-- 손님 화면 상품 읽기(mall_builder_shop_products)는 품번을 돌려주지 않고 한 번에 200개까지라, 품번 → id만 이 함수로 찾고
-- 상품 자세한 값·가격은 지금처럼 mall_builder_shop_products + 가격 엔진으로 읽는다.
-- 보이는 상품만(mall_builder_product_visible — 사업자 전용·폐쇄몰·판매 상태를 보는 사람 기준으로 판단). 대소문자 무시, 한 번에 300개까지.

create or replace function public.mall_builder_lookup_codes(p_store_id uuid, p_codes text[])
returns table (code text, product_id uuid, variant_id uuid, kind text)
language sql stable security definer set search_path = '' as $$
  with wanted as (
    select distinct upper(btrim(x)) as c from unnest(p_codes[1:300]) x where btrim(coalesce(x, '')) <> ''
  )
  select upper(p.product_code), p.id, null::uuid, 'product'
    from public.mall_builder_products p join wanted w on w.c = upper(p.product_code)
   where p.store_id = p_store_id and public.mall_builder_product_visible(p.id)
  union all
  select upper(v.sku), v.product_id, v.id, 'variant'
    from public.mall_builder_product_variants v join wanted w on w.c = upper(v.sku)
   where v.store_id = p_store_id and v.sku <> '' and public.mall_builder_product_visible(v.product_id)
$$;
