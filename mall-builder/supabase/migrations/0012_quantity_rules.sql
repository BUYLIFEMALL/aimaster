-- AI 쇼핑몰 빌더 F14 — 최소 주문 수량·주문 단위·최대 수량·수량 구간 할인
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경. 적용은 둘로 나눔:
--   mall_builder_0012a_quantity_tables(칸·표·규칙) / mall_builder_0012b_place_order_quantity(주문 함수 교체)
-- 계산 규칙은 src/lib/pricing.ts priceLine과 같다: 등급가 다음에 구간 할인(수량 이상인 가장 큰 구간 하나),
--   rate = 내림(단가 × (100 − %) / 100), amount = 단가 − 할인액(0 미만 없음), unit_price = min(단가, 지정가 + 옵션 추가금)

-- ── 0012a ──
alter table public.mall_builder_products add column if not exists moq integer not null default 1 check (moq between 1 and 999);
alter table public.mall_builder_products add column if not exists order_unit integer not null default 1 check (order_unit between 1 and 999);
alter table public.mall_builder_products add column if not exists max_qty integer check (max_qty is null or max_qty between 1 and 999);

create table if not exists public.mall_builder_product_volume_tiers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  min_qty integer not null check (min_qty between 2 and 999),
  discount_type text not null check (discount_type in ('rate', 'amount', 'unit_price')),
  value bigint not null check (value >= 0 and (discount_type <> 'rate' or value between 1 and 99)),
  unique (product_id, min_qty)
);

create or replace function public.mall_builder_volume_tiers_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.mall_builder_products p where p.id = new.product_id and p.store_id = new.store_id) then
    raise exception '이 몰의 상품이 아닙니다.' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger mall_builder_volume_tiers_guard before insert or update on public.mall_builder_product_volume_tiers
  for each row execute function public.mall_builder_volume_tiers_guard();

alter table public.mall_builder_product_volume_tiers enable row level security;
-- 구간 할인은 상품 안내용으로 공개(영업 중 몰), 쓰기는 운영자
create policy "mall_builder_volume_tiers_read" on public.mall_builder_product_volume_tiers
  for select using (
    public.mall_builder_is_store_staff(store_id)
    or exists (select 1 from public.mall_builder_stores s where s.id = store_id and s.status = 'active')
  );
create policy "mall_builder_volume_tiers_write" on public.mall_builder_product_volume_tiers
  for all using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));

-- ── 0012b: 주문 함수 — 0011의 함수에 수량 규칙 검사와 구간 할인을 더한 것(바뀐 곳에 ★) ──
-- 주의(2026-11-04): 이 묶음은 확인 창이 두 번 연속 만료됐고, 아래 설명 주석 두 줄을 붙여 보내자 바로 적용됐다(docs/mall/LESSONS_LEARNED.md)
-- 함수 정의만 바꾼다(create or replace). 지금 지워지는 데이터는 없다.
-- 함수 안의 delete는 손님이 주문할 때 그 손님 장바구니 줄만 비우는 기존 동작(0008·0011과 같음)이다.
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
  v_extra bigint;
  v_base bigint;
  v_unit bigint;
  v_before bigint;
  v_tier public.mall_builder_product_volume_tiers%rowtype;
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
           p.visibility, p.price_visibility, p.moq, p.order_unit, p.max_qty,
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

    v_extra := case when v_has_opt then coalesce(v_line.extra_price, 0) else 0 end;
    v_base := v_line.base_price + v_extra;
    v_unit := greatest(0, case
      when v_line.grade_price is not null then v_line.grade_price + v_extra
      when v_line.grade_rate is not null then floor(v_base * (100 - v_line.grade_rate) / 100.0)::bigint
      else v_base end);
    v_breakdown := jsonb_build_array(jsonb_build_object('label', '판매가', 'amount', v_line.base_price));
    if v_extra <> 0 then
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '옵션 추가금', 'amount', v_extra));
    end if;
    if v_unit <> v_base then
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '등급가(' || coalesce(v_grade_name, '') || ')', 'amount', v_unit - v_base));
    end if;

    -- ★ 수량 구간 할인(등급가 다음, 가장 큰 구간 하나)
    select * into v_tier from public.mall_builder_product_volume_tiers t
      where t.product_id = v_line.product_id and t.min_qty <= v_line.qty order by t.min_qty desc limit 1;
    if found then
      v_before := v_unit;
      v_unit := case v_tier.discount_type
        when 'rate' then floor(v_unit * (100 - v_tier.value) / 100.0)::bigint
        when 'amount' then greatest(0, v_unit - v_tier.value)
        else least(v_unit, v_tier.value + v_extra) end;
      if v_unit <> v_before then
        v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '수량 할인(' || v_tier.min_qty || '개 이상)', 'amount', v_unit - v_before));
      end if;
    end if;

    -- ★ 수량 규칙
    if v_line.qty < v_line.moq then raise exception '「%」은(는) 최소 %개부터 주문할 수 있습니다.', v_line.name, v_line.moq; end if;
    if v_line.order_unit > 1 and v_line.qty % v_line.order_unit <> 0 then raise exception '「%」은(는) %개 단위로 주문해 주세요.', v_line.name, v_line.order_unit; end if;
    if v_line.max_qty is not null and v_line.qty > v_line.max_qty then raise exception '「%」은(는) 최대 %개까지 주문할 수 있습니다.', v_line.name, v_line.max_qty; end if;

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
