-- AI 쇼핑몰 빌더 D2 — 사업자 전용 상품·가격 비공개 판매가를 DB 직접 조회에서도 보호
-- 전에는 상품 표 공개 읽기가 판매 상태·몰 상태만 봐서, 화면에서 가린 사업자 전용 상품과 비공개 판매가가 DB 직접 조회로는 보였다(README F13 「알려진 한계」).
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 지우기·권한 회수 문장 없음(docs/mall/LESSONS_LEARNED.md 점검 목록).
-- 적용은 둘로 나눔: mall_builder_0018a_viewer_functions(함수) / mall_builder_0018b_product_read_policies(규칙 바꾸기 — alter policy)
-- 판단 규칙은 앱 src/lib/pricing.ts의 viewerOf·priceLine 1단계와 같다. 바꾸면 둘 다 바꾼다.

-- ── 0018a ──
-- 이 몰에서 지금 보는 사람: guest(비로그인) / consumer / pending(사업자 승인 대기) / business(승인 사업자)
create or replace function public.mall_builder_shop_viewer(p_store_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when auth.uid() is null then 'guest'
    when c.id is null then 'consumer'
    when c.approval_status = 'approved' and coalesce(g.is_business, false) then 'business'
    when c.approval_status = 'pending' then 'pending'
    else 'consumer' end
  from (select 1) one
  left join public.mall_builder_store_customers c on c.store_id = p_store_id and c.user_id = auth.uid()
  left join public.mall_builder_customer_grades g on g.id = c.grade_id;
$$;

-- 손님에게 상품이 보이는가(가격과 별개): 판매 중·품절 + 운영 중인 몰 + 사업자 전용이면 승인 사업자만
create or replace function public.mall_builder_product_visible(p_product_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mall_builder_products p join public.mall_builder_stores s on s.id = p.store_id
    where p.id = p_product_id and p.status in ('on_sale', 'sold_out') and s.status = 'active'
      and (p.visibility <> 'business_only' or public.mall_builder_shop_viewer(p.store_id) = 'business')
  );
$$;

-- 이 사람에게 가격이 보이는가
create or replace function public.mall_builder_price_open(p_store_id uuid, p_price_visibility text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case coalesce(p_price_visibility, 'all')
    when 'all' then true
    when 'login' then public.mall_builder_shop_viewer(p_store_id) <> 'guest'
    else public.mall_builder_shop_viewer(p_store_id) = 'business' end;
$$;

-- 손님 화면 상품 목록 — 보이는 상품만, 가격 비공개면 판매가 0·정가 null로 가려서. 최근 등록 순
create or replace function public.mall_builder_shop_products(p_store_id uuid, p_ids uuid[] default null, p_q text default null, p_limit integer default 60)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'summary', p.summary, 'description', p.description,
    'base_price', case when o.open then p.base_price else 0 end,
    'list_price', case when o.open then p.list_price else null end,
    'tax_type', p.tax_type, 'status', p.status, 'stock_mode', p.stock_mode, 'stock', p.stock, 'images', p.images,
    'option_groups', p.option_groups, 'shipping_policy_id', p.shipping_policy_id, 'visibility', p.visibility,
    'price_visibility', p.price_visibility, 'moq', p.moq, 'order_unit', p.order_unit, 'max_qty', p.max_qty, 'created_at', p.created_at)
  from public.mall_builder_products p
  cross join lateral (select public.mall_builder_price_open(p.store_id, p.price_visibility) as open) o
  where p.store_id = p_store_id
    and public.mall_builder_product_visible(p.id)
    and (p_ids is null or p.id = any (p_ids))
    and (coalesce(btrim(p_q), '') = '' or p.name ilike '%' || replace(replace(replace(btrim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%')
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 60), 1), 200);
$$;

-- ── 0018b ──
-- 상품 표: 보이고 + 가격도 보이는 상품만 직접 읽기(가격 비공개 상품은 위 함수로 가려서 읽는다)
alter policy "mall_builder_products_read" on public.mall_builder_products
  using (public.mall_builder_is_store_staff(store_id) or (public.mall_builder_product_visible(id) and public.mall_builder_price_open(store_id, price_visibility)));
-- 옵션 조합·카테고리 연결: 상품이 보이면(가격 비공개여도) 읽기 — 옵션 고르기·카테고리 목록용
alter policy "mall_builder_product_variants_read" on public.mall_builder_product_variants
  using (public.mall_builder_is_store_staff(store_id) or public.mall_builder_product_visible(product_id));
alter policy "mall_builder_product_categories_read" on public.mall_builder_product_categories
  using (public.mall_builder_is_store_staff(store_id) or public.mall_builder_product_visible(product_id));
