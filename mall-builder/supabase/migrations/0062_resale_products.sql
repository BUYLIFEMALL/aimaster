-- AI 쇼핑몰 빌더 T2-2 — 분양몰 거울 상품: 본사 상품 담기·판매가(본사가 이상)·빼기·원본 변경 자동 반영 (2026-11-13)
-- 설계 docs/PLAN_20261113_T2_RESALE_MALL.md §2. 추가·함수 추가만(drop 없음).

alter table public.mall_builder_products add column if not exists source_product_id uuid references public.mall_builder_products (id) on delete set null;
create unique index if not exists mall_builder_products_one_mirror on public.mall_builder_products (store_id, source_product_id) where source_product_id is not null;
create index if not exists mall_builder_products_source on public.mall_builder_products (source_product_id) where source_product_id is not null;
alter table public.mall_builder_shipping_policies add column if not exists source_policy_id uuid references public.mall_builder_shipping_policies (id) on delete set null;

-- 본사 상품 중 분양몰에 담을 수 있는 것: 승인됨·판매 중/품절·가격 공개·사업자 전용 아님·공급사 입점 중
create or replace function mall_builder_private.resale_source_ok(p public.mall_builder_products)
returns boolean language sql stable security definer set search_path = '' as $$
  select p.approval = 'approved' and p.status in ('on_sale', 'sold_out') and coalesce(p.visibility, 'all') <> 'business_only'
     and coalesce(p.price_visibility, 'all') = 'all' and p.source_product_id is null
     and (p.supplier_id is null or exists (select 1 from public.mall_builder_suppliers x where x.id = p.supplier_id and x.status = 'active'))
$$;

-- 원본 상품의 배송비 정책을 분양몰에 같은 조건으로 복사(한 번만, 원본 정책이 바뀌면 함께 갱신)
create or replace function mall_builder_private.resale_policy_for(p_resale_store uuid, p_source_product public.mall_builder_products)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_src public.mall_builder_shipping_policies%rowtype; v_id uuid;
begin
  select * into v_src from public.mall_builder_shipping_policies sp
   where sp.id = coalesce(p_source_product.shipping_policy_id,
                          (select d.id from public.mall_builder_shipping_policies d where d.store_id = p_source_product.store_id and d.is_default));
  if v_src.id is null then return null; end if;
  select sp.id into v_id from public.mall_builder_shipping_policies sp where sp.store_id = p_resale_store and sp.source_policy_id = v_src.id;
  if v_id is null then
    insert into public.mall_builder_shipping_policies (store_id, name, type, base_fee, free_over, jeju_fee, island_fee, is_default, source_policy_id)
    values (p_resale_store, left(v_src.name, 30), v_src.type, v_src.base_fee, v_src.free_over, v_src.jeju_fee, v_src.island_fee, false, v_src.id)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- 원본 정책이 바뀌면 분양몰 복사본도 같은 조건으로
create or replace function public.mall_builder_policies_resale_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.mall_builder_shipping_policies
     set type = new.type, base_fee = new.base_fee, free_over = new.free_over, jeju_fee = new.jeju_fee, island_fee = new.island_fee
   where source_policy_id = new.id;
  return new;
end;
$$;
drop trigger if exists mall_builder_policies_resale_sync on public.mall_builder_shipping_policies;
create trigger mall_builder_policies_resale_sync after update on public.mall_builder_shipping_policies
  for each row when (old.source_policy_id is null) execute function public.mall_builder_policies_resale_sync();

-- 분양자: 본사 상품 담기. p_markup = 처음 판매가를 본사가보다 몇 % 높게(0~300, 나중에 상품별로 고침). 돌려주는 값 = 새로 담은 수
create or replace function public.mall_builder_resale_add(p_store_id uuid, p_source_ids uuid[], p_markup numeric)
returns int language plpgsql security definer set search_path = '' as $$
declare
  s public.mall_builder_stores%rowtype;
  src public.mall_builder_products%rowtype;
  v_mirror uuid;
  v_n int := 0;
  v_rate numeric := coalesce(p_markup, 0);
begin
  select * into s from public.mall_builder_stores x where x.id = p_store_id;
  if s.id is null or s.kind <> 'resale' or auth.uid() is null or not public.mall_builder_staff_can(s.id, 'products') then raise exception '분양몰을 찾을 수 없습니다.'; end if;
  if v_rate < 0 or v_rate > 300 then raise exception '처음 판매가 인상률은 0~300%% 사이로 적어 주세요.'; end if;
  if coalesce(array_length(p_source_ids, 1), 0) = 0 then raise exception '담을 상품을 골라 주세요.'; end if;
  if coalesce(array_length(p_source_ids, 1), 0) > 200 then raise exception '한 번에 200개까지 담을 수 있습니다.'; end if;
  if (select count(*) from public.mall_builder_products p where p.store_id = s.id) + array_length(p_source_ids, 1) > 2000 then
    raise exception '분양몰 상품은 2,000개까지 담을 수 있습니다.';
  end if;
  for src in select * from public.mall_builder_products p where p.id = any(p_source_ids) and p.store_id = s.source_store_id loop
    continue when not mall_builder_private.resale_source_ok(src);
    continue when exists (select 1 from public.mall_builder_products m where m.store_id = s.id and m.source_product_id = src.id);
    insert into public.mall_builder_products (store_id, name, summary, description, base_price, list_price, tax_type, status, stock_mode, stock,
                                              images, option_groups, shipping_policy_id, moq, order_unit, max_qty, source_product_id)
    values (s.id, src.name, src.summary, src.description, ceil(src.base_price * (100 + v_rate) / 100.0)::bigint, src.list_price, src.tax_type,
            src.status, src.stock_mode, src.stock, src.images, src.option_groups, mall_builder_private.resale_policy_for(s.id, src),
            src.moq, src.order_unit, src.max_qty, src.id)
    returning id into v_mirror;
    insert into public.mall_builder_product_variants (product_id, store_id, key, "values", extra_price, stock, sku, is_active, sort)
    select v_mirror, s.id, v.key, v."values", v.extra_price, v.stock, v.sku, v.is_active, v.sort
      from public.mall_builder_product_variants v where v.product_id = src.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- 분양자: 판매가 정하기(본사 판매가 이상, 상한 없음)
create or replace function public.mall_builder_resale_price(p_product_id uuid, p_price bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.mall_builder_products%rowtype; v_src bigint;
begin
  select * into m from public.mall_builder_products x where x.id = p_product_id for update;
  if m.id is null or m.source_product_id is null or auth.uid() is null or not public.mall_builder_staff_can(m.store_id, 'products') then raise exception '분양 상품을 찾을 수 없습니다.'; end if;
  select p.base_price into v_src from public.mall_builder_products p where p.id = m.source_product_id;
  if p_price is null or p_price < coalesce(v_src, 0) then raise exception '판매가는 본사 판매가(%원) 이상이어야 합니다.', coalesce(v_src, 0); end if;
  if p_price > 1000000000 then raise exception '판매가를 확인해 주세요.'; end if;
  update public.mall_builder_products set base_price = p_price, updated_at = now() where id = m.id;
end;
$$;

-- 분양자: 빼기(주문 기록이 없으면 지우고, 있으면 「준비 중」으로 숨김 — 원본이 바뀌어도 다시 나오지 않음)
create or replace function public.mall_builder_resale_remove(p_product_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare m public.mall_builder_products%rowtype;
begin
  select * into m from public.mall_builder_products x where x.id = p_product_id for update;
  if m.id is null or m.source_product_id is null or auth.uid() is null or not public.mall_builder_staff_can(m.store_id, 'products') then raise exception '분양 상품을 찾을 수 없습니다.'; end if;
  if exists (select 1 from public.mall_builder_order_items i where i.product_id = m.id) then
    update public.mall_builder_products set status = 'draft', updated_at = now() where id = m.id;
    return 'hidden';
  end if;
  delete from public.mall_builder_products where id = m.id;
  return 'deleted';
end;
$$;

-- 원본 상품이 바뀌면 거울 상품에 반영: 내용·사진·옵션 구성·재고, 판매 상태(분양자가 뺀 「준비 중」은 그대로), 판매가가 원본보다 낮아지면 원본가로
create or replace function public.mall_builder_products_resale_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ok boolean;
begin
  if not exists (select 1 from public.mall_builder_products m where m.source_product_id = new.id) then return new; end if;
  v_ok := mall_builder_private.resale_source_ok(new);
  update public.mall_builder_products m
     set name = new.name, summary = new.summary, description = new.description, images = new.images, tax_type = new.tax_type,
         list_price = new.list_price, option_groups = new.option_groups, stock_mode = new.stock_mode, stock = new.stock,
         moq = new.moq, order_unit = new.order_unit, max_qty = new.max_qty,
         status = case when m.status = 'draft' then 'draft' when v_ok then new.status else 'hidden' end,
         base_price = greatest(m.base_price, new.base_price),
         updated_at = now()
   where m.source_product_id = new.id;
  return new;
end;
$$;
drop trigger if exists mall_builder_products_resale_sync on public.mall_builder_products;
create trigger mall_builder_products_resale_sync after update on public.mall_builder_products
  for each row when (old.source_product_id is null) execute function public.mall_builder_products_resale_sync();

-- 원본 옵션 조합이 바뀌면 거울 조합도(같은 열쇠)
create or replace function public.mall_builder_variants_resale_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.mall_builder_product_variants mv using public.mall_builder_products m
     where mv.product_id = m.id and m.source_product_id = old.product_id and mv.key = old.key;
    return old;
  end if;
  insert into public.mall_builder_product_variants (product_id, store_id, key, "values", extra_price, stock, sku, is_active, sort)
  select m.id, m.store_id, new.key, new."values", new.extra_price, new.stock, new.sku, new.is_active, new.sort
    from public.mall_builder_products m where m.source_product_id = new.product_id
  on conflict (product_id, key) do update
    set "values" = excluded."values", extra_price = excluded.extra_price, stock = excluded.stock, sku = excluded.sku,
        is_active = excluded.is_active, sort = excluded.sort;
  return new;
end;
$$;
drop trigger if exists mall_builder_variants_resale_sync on public.mall_builder_product_variants;
create trigger mall_builder_variants_resale_sync after insert or update or delete on public.mall_builder_product_variants
  for each row execute function public.mall_builder_variants_resale_sync();

-- 분양몰 지킴이: 분양몰에는 직접 상품을 올릴 수 없고(거울 상품만), 거울 상품 판매가는 원본가 밑으로 못 내림, 원본 연결은 못 바꿈
create or replace function public.mall_builder_products_resale_guard()
returns trigger language plpgsql set search_path = '' as $$
declare v_kind text; v_src bigint;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  select s.kind into v_kind from public.mall_builder_stores s where s.id = new.store_id;
  if v_kind = 'resale' then
    if tg_op = 'INSERT' then raise exception '분양몰에는 직접 상품을 올릴 수 없습니다. 「분양」 화면에서 본사 상품을 담아 주세요.'; end if;
    if new.source_product_id is distinct from old.source_product_id then raise exception '분양 상품의 원본 연결은 바꿀 수 없습니다.'; end if;
    select p.base_price into v_src from public.mall_builder_products p where p.id = new.source_product_id;
    if new.base_price < coalesce(v_src, 0) then raise exception '판매가는 본사 판매가(%원) 이상이어야 합니다.', coalesce(v_src, 0); end if;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_products_resale_guard on public.mall_builder_products;
create trigger mall_builder_products_resale_guard before insert or update on public.mall_builder_products
  for each row execute function public.mall_builder_products_resale_guard();

-- 분양자 화면: 본사 상품 목록(담을 수 있는 것) — 분양몰 대표·상품 권한 직원만
create or replace function public.mall_builder_resale_catalog(p_store_id uuid, p_q text default null)
returns table (id uuid, name text, base_price bigint, status text, stock_mode text, stock int, image text, option_count int, added boolean)
language plpgsql stable security definer set search_path = '' as $$
declare s public.mall_builder_stores%rowtype;
begin
  select * into s from public.mall_builder_stores x where x.id = p_store_id;
  if s.id is null or s.kind <> 'resale' or auth.uid() is null or not public.mall_builder_staff_can(s.id, 'products') then raise exception '분양몰을 찾을 수 없습니다.'; end if;
  return query
    select p.id, p.name, p.base_price, p.status, p.stock_mode, p.stock, p.images -> 0 ->> 'url',
           (select count(*)::int from public.mall_builder_product_variants v where v.product_id = p.id),
           exists (select 1 from public.mall_builder_products m where m.store_id = s.id and m.source_product_id = p.id)
      from public.mall_builder_products p
     where p.store_id = s.source_store_id and mall_builder_private.resale_source_ok(p)
       and (p_q is null or btrim(p_q) = '' or p.name ilike '%' || btrim(p_q) || '%')
     order by p.updated_at desc
     limit 300;
end;
$$;

revoke all on function mall_builder_private.resale_source_ok(public.mall_builder_products) from public, anon, authenticated;
revoke all on function mall_builder_private.resale_policy_for(uuid, public.mall_builder_products) from public, anon, authenticated;
revoke all on function public.mall_builder_policies_resale_sync() from public, anon, authenticated;
revoke all on function public.mall_builder_products_resale_sync() from public, anon, authenticated;
revoke all on function public.mall_builder_variants_resale_sync() from public, anon, authenticated;
revoke all on function public.mall_builder_products_resale_guard() from public, anon, authenticated;
revoke all on function public.mall_builder_resale_add(uuid, uuid[], numeric) from public, anon;
revoke all on function public.mall_builder_resale_price(uuid, bigint) from public, anon;
revoke all on function public.mall_builder_resale_remove(uuid) from public, anon;
revoke all on function public.mall_builder_resale_catalog(uuid, text) from public, anon;
grant execute on function public.mall_builder_resale_add(uuid, uuid[], numeric) to authenticated;
grant execute on function public.mall_builder_resale_price(uuid, bigint) to authenticated;
grant execute on function public.mall_builder_resale_remove(uuid) to authenticated;
grant execute on function public.mall_builder_resale_catalog(uuid, text) to authenticated;
