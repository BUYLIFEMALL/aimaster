-- AI 쇼핑몰 빌더 F13 — 등급별 가격·가격 비공개·사업자 전용 상품
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(확인 창 방지 — revoke·drop 없음, 주문 함수는 create or replace)
-- 실제 적용은 둘로 나눔: mall_builder_0011a_grade_price_tables(칸·표·규칙), mall_builder_0011b_place_order_grades(주문 함수)
--   — 한 번에 보냈을 때 DB 도구 확인 창이 2분 만에 만료됨(2026-11-03)
-- 계산 규칙은 src/lib/pricing.ts priceLine과 같다(등급가: 금액 지정 = 금액 + 옵션 추가금, 할인율 = (판매가 + 추가금) × (100 − %) / 100 내림)

alter table public.mall_builder_products add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'members', 'business_only'));
alter table public.mall_builder_products add column if not exists price_visibility text not null default 'all'
  check (price_visibility in ('all', 'login', 'approved_business'));

create table if not exists public.mall_builder_product_grade_prices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  grade_id uuid not null references public.mall_builder_customer_grades (id) on delete cascade,
  price bigint check (price is null or price between 0 and 1000000000),
  discount_rate integer check (discount_rate is null or discount_rate between 1 and 99),
  check ((price is null) <> (discount_rate is null)),
  unique (product_id, grade_id)
);
create index if not exists mall_builder_product_grade_prices_grade on public.mall_builder_product_grade_prices (grade_id);

-- 상품·등급은 같은 몰 것만
create or replace function public.mall_builder_grade_prices_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.mall_builder_products p where p.id = new.product_id and p.store_id = new.store_id)
     or not exists (select 1 from public.mall_builder_customer_grades g where g.id = new.grade_id and g.store_id = new.store_id) then
    raise exception '같은 몰의 상품과 등급만 연결할 수 있습니다.' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger mall_builder_grade_prices_guard before insert or update on public.mall_builder_product_grade_prices
  for each row execute function public.mall_builder_grade_prices_guard();

alter table public.mall_builder_product_grade_prices enable row level security;
-- 읽기: 그 몰 운영자, 그리고 그 등급인 손님 본인(다른 등급 가격은 못 봄)
create policy "mall_builder_grade_prices_read" on public.mall_builder_product_grade_prices
  for select using (
    public.mall_builder_is_store_staff(store_id)
    or exists (select 1 from public.mall_builder_store_customers c
      where c.store_id = mall_builder_product_grade_prices.store_id and c.user_id = (select auth.uid()) and c.grade_id = mall_builder_product_grade_prices.grade_id)
  );
create policy "mall_builder_grade_prices_write" on public.mall_builder_product_grade_prices
  for all using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));

-- 주문 함수: 보는 사람(일반·승인 대기·승인 사업자)에 따라 사업자 전용·가격 비공개를 막고, 손님 등급의 등급가로 계산
create or replace function public.mall_builder_place_order(
  p_store_id uuid,
  p_address_id uuid,
  p_depositor text,
  p_memo text,
  p_expected_total bigint
) returns table (order_id uuid, order_no text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_store public.mall_builder_stores%rowtype;
  v_customer public.mall_builder_store_customers%rowtype;
  v_addr public.mall_builder_customer_addresses%rowtype;
  v_viewer text;
  v_grade_name text;
  v_region text;
  v_default uuid;
  v_order uuid;
  v_seq integer;
  v_no text;
  v_line record;
  v_has_opt boolean;
  v_base bigint;
  v_unit bigint;
  v_avail integer;
  v_key text;
  v_groups jsonb := '{}'::jsonb;
  v_subtotal bigint := 0;
  v_ship bigint := 0;
  v_count integer := 0;
  v_policy public.mall_builder_shipping_policies%rowtype;
  v_fee bigint;
  v_breakdown jsonb;
  v_info jsonb;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_store from public.mall_builder_stores s where s.id = p_store_id and s.status = 'active' for update;
  if not found then raise exception '주문할 수 없는 몰입니다.'; end if;
  select * into v_customer from public.mall_builder_store_customers c where c.store_id = p_store_id and c.user_id = v_uid;
  if not found then raise exception '이 몰에 가입한 뒤 주문할 수 있습니다.'; end if;
  select * into v_addr from public.mall_builder_customer_addresses a where a.id = p_address_id and a.customer_id = v_customer.id;
  if not found then raise exception '배송지를 골라 주세요.'; end if;
  if char_length(btrim(coalesce(p_depositor, ''))) not between 1 and 20 then raise exception '입금자명을 1~20자로 입력해 주세요.'; end if;
  if char_length(coalesce(p_memo, '')) > 200 then raise exception '배송 메모는 200자 이내로 입력해 주세요.'; end if;

  -- 보는 사람(pricing.ts viewerOf와 같음)
  select g.name, case
      when v_customer.approval_status = 'approved' and g.is_business then 'business'
      when v_customer.approval_status = 'pending' then 'pending'
      else 'consumer' end
    into v_grade_name, v_viewer
    from public.mall_builder_customer_grades g where g.id = v_customer.grade_id;
  v_viewer := coalesce(v_viewer, case when v_customer.approval_status = 'pending' then 'pending' else 'consumer' end);

  delete from public.mall_builder_cart_items ci
    using public.mall_builder_products p
    where ci.product_id = p.id and ci.store_id = p_store_id and ci.user_id = v_uid and p.status in ('draft', 'hidden');

  perform 1 from public.mall_builder_products p
    where p.id in (select ci.product_id from public.mall_builder_cart_items ci where ci.store_id = p_store_id and ci.user_id = v_uid)
    order by p.id for update;
  perform 1 from public.mall_builder_product_variants v
    where v.id in (select ci.variant_id from public.mall_builder_cart_items ci where ci.store_id = p_store_id and ci.user_id = v_uid)
    order by v.id for update;

  v_region := public.mall_builder_region(v_addr.zip);
  select sp.id into v_default from public.mall_builder_shipping_policies sp where sp.store_id = p_store_id and sp.is_default;
  select coalesce(max(o.seq), 0) + 1 into v_seq from public.mall_builder_orders o where o.store_id = p_store_id;
  v_no := to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');
  v_info := coalesce(v_store.business_info, '{}'::jsonb);

  insert into public.mall_builder_orders (store_id, seq, order_no, user_id, customer_id, receiver, depositor, bank, memo)
  values (
    p_store_id, v_seq, v_no, v_uid, v_customer.id,
    jsonb_build_object('label', v_addr.label, 'receiver', v_addr.receiver, 'phone', v_addr.phone, 'zip', v_addr.zip, 'addr1', v_addr.addr1, 'addr2', v_addr.addr2, 'region', v_region),
    btrim(p_depositor),
    jsonb_build_object('bank_name', v_info ->> 'bank_name', 'bank_account', v_info ->> 'bank_account', 'bank_holder', v_info ->> 'bank_holder'),
    coalesce(p_memo, '')
  ) returning id into v_order;

  for v_line in
    select ci.qty, p.id as product_id, p.name, p.status, p.base_price, p.stock_mode, p.stock, p.option_groups, p.images, p.shipping_policy_id,
           p.visibility, p.price_visibility,
           v.id as variant_id, v.key as variant_key, v.extra_price, v.stock as variant_stock, v.is_active,
           gp.price as grade_price, gp.discount_rate as grade_rate
    from public.mall_builder_cart_items ci
    join public.mall_builder_products p on p.id = ci.product_id
    left join public.mall_builder_product_variants v on v.id = ci.variant_id
    left join public.mall_builder_product_grade_prices gp on gp.product_id = p.id and gp.grade_id = v_customer.grade_id
    where ci.store_id = p_store_id and ci.user_id = v_uid
    order by ci.created_at
  loop
    v_count := v_count + 1;
    if v_line.visibility = 'business_only' and v_viewer <> 'business' then raise exception '「%」은(는) 사업자 회원 전용 상품입니다.', v_line.name; end if;
    if v_line.price_visibility = 'approved_business' and v_viewer <> 'business' then raise exception '「%」은(는) 사업자 승인 후 가격이 공개됩니다.', v_line.name; end if;
    if v_line.status = 'sold_out' then raise exception '「%」은(는) 품절된 상품입니다.', v_line.name; end if;
    if v_line.status <> 'on_sale' then raise exception '「%」은(는) 지금 판매하지 않는 상품입니다.', v_line.name; end if;
    v_has_opt := jsonb_array_length(coalesce(v_line.option_groups, '[]'::jsonb)) > 0;
    if v_has_opt and v_line.variant_id is null then raise exception '「%」의 옵션을 선택해 주세요.', v_line.name; end if;
    if not v_has_opt and v_line.variant_id is not null then raise exception '「%」은(는) 옵션이 없는 상품입니다.', v_line.name; end if;
    if v_line.variant_id is not null and not v_line.is_active then raise exception '「% %」 옵션은 판매하지 않습니다.', v_line.name, v_line.variant_key; end if;

    v_base := v_line.base_price + (case when v_has_opt then coalesce(v_line.extra_price, 0) else 0 end);
    v_unit := greatest(0, case
      when v_line.grade_price is not null then v_line.grade_price + (case when v_has_opt then coalesce(v_line.extra_price, 0) else 0 end)
      when v_line.grade_rate is not null then floor(v_base * (100 - v_line.grade_rate) / 100.0)::bigint
      else v_base end);
    if v_line.stock_mode = 'product' then
      v_avail := case when v_has_opt then v_line.variant_stock else v_line.stock end;
      if v_avail <= 0 then raise exception '「%」은(는) 품절입니다.', v_line.name || coalesce(' ' || v_line.variant_key, ''); end if;
      if v_line.qty > v_avail then raise exception '「%」 재고가 %개 남았습니다.', v_line.name || coalesce(' ' || v_line.variant_key, ''), v_avail; end if;
      if v_has_opt then
        update public.mall_builder_product_variants set stock = stock - v_line.qty where id = v_line.variant_id;
      else
        update public.mall_builder_products set stock = stock - v_line.qty where id = v_line.product_id;
      end if;
    end if;

    v_breakdown := jsonb_build_array(jsonb_build_object('label', '판매가', 'amount', v_line.base_price));
    if v_has_opt and coalesce(v_line.extra_price, 0) <> 0 then
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '옵션 추가금', 'amount', v_line.extra_price));
    end if;
    if v_unit <> v_base then
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '등급가(' || coalesce(v_grade_name, '') || ')', 'amount', v_unit - v_base));
    end if;
    insert into public.mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, image_url, unit_price, qty, line_total, price_breakdown, shipping_policy_id)
    values (v_order, v_line.product_id, v_line.variant_id, v_line.name, coalesce(v_line.variant_key, ''), v_line.images -> 0 ->> 'url',
            v_unit, v_line.qty, v_unit * v_line.qty, v_breakdown, coalesce(v_line.shipping_policy_id, v_default));

    v_subtotal := v_subtotal + v_unit * v_line.qty;
    v_key := coalesce(coalesce(v_line.shipping_policy_id, v_default)::text, 'none');
    v_groups := jsonb_set(v_groups, array[v_key], to_jsonb(coalesce((v_groups ->> v_key)::bigint, 0) + v_unit * v_line.qty));
  end loop;
  if v_count = 0 then raise exception '장바구니가 비어 있습니다.'; end if;

  for v_key in select jsonb_object_keys(v_groups) loop
    continue when v_key = 'none';
    select * into v_policy from public.mall_builder_shipping_policies sp where sp.id = v_key::uuid;
    continue when not found;
    v_fee := case v_policy.type
      when 'fixed' then v_policy.base_fee
      when 'conditional' then case when v_policy.free_over is not null and (v_groups ->> v_key)::bigint >= v_policy.free_over then 0 else v_policy.base_fee end
      else 0 end;
    if v_region = 'jeju' then v_fee := v_fee + v_policy.jeju_fee; end if;
    if v_region = 'island' then v_fee := v_fee + v_policy.island_fee; end if;
    v_ship := v_ship + v_fee;
  end loop;

  if p_expected_total is distinct from v_subtotal + v_ship then
    raise exception '가격이 바뀌었습니다. 주문서를 다시 확인해 주세요. (현재 %원)', to_char(v_subtotal + v_ship, 'FM999,999,999,999');
  end if;

  update public.mall_builder_orders set subtotal = v_subtotal, shipping_fee = v_ship, total = v_subtotal + v_ship where id = v_order;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (v_order, null, 'pending_payment', v_uid, 'customer', '주문 접수(무통장 입금 대기)');
  delete from public.mall_builder_cart_items ci where ci.store_id = p_store_id and ci.user_id = v_uid;
  return query select v_order, v_no;
end;
$$;
