-- AI 쇼핑몰 빌더 T1 마무리 — ① B2B 입점몰: 공급사 상품 옵션 · 공급사별 배송비 (2026-11-13)
-- 플랜 docs/PLAN_20261113_T1_SUPPLIER_OPTIONS_SHIPPING.md. 주인님 결정: 배송비 정책은 공급사가 정하고 운영자가 보고 고침,
--   공급사 묶음 배송비는 공급사 정산에 더함, 옵션 추가 판매가 기본값 = 추가 공급가 × (판매가 / 공급가).
-- 추가·함수 교체만(drop 없음). Lab(rjjtjakljjxsgjelqgek) → 로컬 전체 실행 검사 → 운영(esgxyikcnnvmlhygjkth, 승인).

-- ── A. 옵션별 추가 공급가(손님이 읽지 못하게 공급가처럼 별도 표) ──
create table if not exists public.mall_builder_variant_supply (
  variant_id uuid primary key references public.mall_builder_product_variants (id) on delete cascade,
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  supplier_id uuid not null references public.mall_builder_suppliers (id),
  extra_supply bigint not null default 0 check (extra_supply >= 0 and extra_supply <= 1000000000),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_variant_supply_product on public.mall_builder_variant_supply (product_id);
alter table public.mall_builder_variant_supply enable row level security;
-- 읽기: 상품 권한 운영자, 공급사 본인. 쓰기 규칙 없음(함수로만)
create policy mall_builder_variant_supply_read on public.mall_builder_variant_supply for select
  using (public.mall_builder_staff_can(store_id, 'products')
         or exists (select 1 from public.mall_builder_suppliers x where x.id = mall_builder_variant_supply.supplier_id and x.user_id = (select auth.uid())));

-- 옵션 추가 판매가 기본값(src/lib/supplier.ts defaultExtraSale과 같은 계산)
create or replace function mall_builder_private.default_extra_sale(p_extra_supply bigint, p_base bigint, p_supply bigint)
returns bigint language sql immutable set search_path = '' as $$
  select case when coalesce(p_supply, 0) <= 0 or coalesce(p_base, 0) <= 0 then p_extra_supply
              else round(p_extra_supply * p_base::numeric / p_supply)::bigint end
$$;

-- 공급사: 내 상품 옵션 저장. p_groups = [{name, values[]}], p_variants = [{key, values[], extra_supply, stock, sku, is_active}]
-- 옵션 구성·추가 공급가가 바뀌면 다시 승인 대기(바로 판매 공급사는 그대로), 재고·품번·사용 여부만 바뀌면 그대로 판매
create or replace function public.mall_builder_supplier_options_save(p_product_id uuid, p_groups jsonb, p_variants jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v public.mall_builder_products%rowtype;
  v_sid uuid;
  v_auto boolean;
  v_supply bigint;
  v_groups jsonb := coalesce(p_groups, '[]'::jsonb);
  v_vars jsonb := coalesce(p_variants, '[]'::jsonb);
  v_glen int;
  e jsonb;
  v_key text;
  v_extra bigint;
  v_stock int;
  v_old_extra bigint;
  v_old_sale bigint;
  v_vid uuid;
  v_changed boolean := false;
  v_sort int := 0;
begin
  select * into v from public.mall_builder_products x where x.id = p_product_id for update;
  if v.id is null or auth.uid() is null then raise exception '내 상품을 찾을 수 없습니다.'; end if;
  v_sid := public.mall_builder_my_supplier_id(v.store_id);
  if v_sid is null or v.supplier_id is distinct from v_sid then raise exception '내 상품을 찾을 수 없습니다.'; end if;
  select x.auto_approve into v_auto from public.mall_builder_suppliers x where x.id = v_sid;
  select s.supply_price into v_supply from public.mall_builder_product_supply s where s.product_id = v.id;

  if jsonb_typeof(v_groups) <> 'array' or jsonb_array_length(v_groups) > 3 then raise exception '옵션은 3단까지 만들 수 있습니다.'; end if;
  if jsonb_typeof(v_vars) <> 'array' or jsonb_array_length(v_vars) > 300 then raise exception '옵션 조합은 300개까지입니다.'; end if;
  v_glen := jsonb_array_length(v_groups);
  if (v_glen = 0) <> (jsonb_array_length(v_vars) = 0) then raise exception '옵션과 조합 목록이 맞지 않습니다. 「조합 만들기」를 눌러 주세요.'; end if;

  -- 조합 검사: 값 개수 = 옵션 단 수, 열쇠 = 값을 " / "로 이은 것, 금액·재고 범위
  for e in select * from jsonb_array_elements(v_vars) loop
    v_key := coalesce(e ->> 'key', '');
    if jsonb_typeof(e -> 'values') <> 'array' or jsonb_array_length(e -> 'values') <> v_glen
       or v_key <> (select string_agg(x, ' / ' order by n) from jsonb_array_elements_text(e -> 'values') with ordinality t(x, n))
       or char_length(v_key) not between 1 and 200 then
      raise exception '옵션 조합 「%」을(를) 읽지 못했습니다. 「조합 만들기」를 다시 눌러 주세요.', left(v_key, 50);
    end if;
    begin
      v_extra := coalesce(nullif(e ->> 'extra_supply', '')::bigint, 0);
      v_stock := coalesce(nullif(e ->> 'stock', '')::int, 0);
    exception when others then raise exception '「%」의 추가 공급가·재고는 숫자로 적어 주세요.', v_key;
    end;
    if v_extra < 0 or v_extra > 1000000000 then raise exception '「%」 추가 공급가를 0원 이상으로 적어 주세요.', v_key; end if;
    if v_stock < 0 or v_stock > 1000000 then raise exception '「%」 재고를 0 이상으로 적어 주세요.', v_key; end if;
    if char_length(coalesce(e ->> 'sku', '')) > 50 then raise exception '「%」 품번은 50자 이내로 적어 주세요.', v_key; end if;
  end loop;

  -- 옵션 구성이 바뀌었나
  if v.option_groups is distinct from v_groups then v_changed := true; end if;
  -- 없어진 조합 지우기(추가 공급가 줄도 함께 지워짐)
  if exists (select 1 from public.mall_builder_product_variants pv where pv.product_id = v.id
              and pv.key not in (select x ->> 'key' from jsonb_array_elements(v_vars) x)) then
    v_changed := true;
    delete from public.mall_builder_product_variants pv where pv.product_id = v.id
       and pv.key not in (select x ->> 'key' from jsonb_array_elements(v_vars) x);
  end if;

  for e in select * from jsonb_array_elements(v_vars) loop
    v_key := e ->> 'key';
    v_extra := coalesce(nullif(e ->> 'extra_supply', '')::bigint, 0);
    v_vid := null; v_old_extra := null; v_old_sale := null;
    select pv.id, pv.extra_price, vs.extra_supply into v_vid, v_old_sale, v_old_extra
      from public.mall_builder_product_variants pv left join public.mall_builder_variant_supply vs on vs.variant_id = pv.id
     where pv.product_id = v.id and pv.key = v_key;
    if v_vid is null or v_old_extra is distinct from v_extra then v_changed := true; end if;
    insert into public.mall_builder_product_variants (product_id, store_id, key, "values", extra_price, stock, sku, is_active, sort)
    values (v.id, v.store_id, v_key, e -> 'values',
            -- 추가 공급가가 그대로면 운영자가 정한 판매 추가금 유지, 새 조합·바뀐 조합은 마진 비율 기본값
            case when v_vid is not null and v_old_extra is not distinct from v_extra then v_old_sale
                 else mall_builder_private.default_extra_sale(v_extra, v.base_price, v_supply) end,
            coalesce(nullif(e ->> 'stock', '')::int, 0), coalesce(e ->> 'sku', ''), coalesce((e ->> 'is_active')::boolean, true), v_sort)
    on conflict (product_id, key) do update
      set "values" = excluded."values", extra_price = excluded.extra_price, stock = excluded.stock, sku = excluded.sku,
          is_active = excluded.is_active, sort = excluded.sort
    returning id into v_vid;
    insert into public.mall_builder_variant_supply (variant_id, product_id, store_id, supplier_id, extra_supply)
    values (v_vid, v.id, v.store_id, v_sid, v_extra)
    on conflict (variant_id) do update set extra_supply = excluded.extra_supply, updated_at = now();
    v_sort := v_sort + 1;
  end loop;

  update public.mall_builder_products
     set option_groups = v_groups, updated_at = now(),
         approval = case when not v_changed then approval when v_auto then 'approved' else 'pending' end,
         approval_note = case when v_changed then '' else approval_note end,
         approval_at = case when v_changed and v_auto then now() else approval_at end
   where id = v.id;
  return case when not v_changed then 'kept' when v_auto then 'approved' else 'pending' end;
end;
$$;

-- 운영자(상품 권한): 공급사 상품 옵션별 판매 추가금 정하기. p_prices = {"조합 열쇠": 추가금}
-- 하한: 판매가 + 추가금 ≥ 공급가 + 추가 공급가
create or replace function public.mall_builder_variant_prices_set(p_product_id uuid, p_prices jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.mall_builder_products%rowtype;
  v_supply bigint;
  r record;
  v_price bigint;
begin
  select * into v from public.mall_builder_products x where x.id = p_product_id for update;
  if v.id is null or auth.uid() is null or not public.mall_builder_staff_can(v.store_id, 'products') then raise exception '상품을 찾을 수 없습니다.'; end if;
  if v.supplier_id is null then raise exception '공급사 상품만 여기서 정합니다(자체 상품은 옵션 편집에서).'; end if;
  if jsonb_typeof(coalesce(p_prices, '{}'::jsonb)) <> 'object' then raise exception '추가금 목록을 읽지 못했습니다.'; end if;
  select s.supply_price into v_supply from public.mall_builder_product_supply s where s.product_id = v.id;
  for r in select pv.id, pv.key, coalesce(vs.extra_supply, 0) extra_supply
             from public.mall_builder_product_variants pv left join public.mall_builder_variant_supply vs on vs.variant_id = pv.id
            where pv.product_id = v.id loop
    continue when not (p_prices ? r.key);
    begin
      v_price := (p_prices ->> r.key)::bigint;
    exception when others then raise exception '「%」 추가금은 숫자로 적어 주세요.', r.key;
    end;
    if v_price is null or v_price < -1000000000 or v_price > 1000000000 then raise exception '「%」 추가금을 확인해 주세요.', r.key; end if;
    if v.base_price + v_price < coalesce(v_supply, 0) + r.extra_supply then
      raise exception '「%」 판매가(%원)가 공급가(%원)보다 낮습니다.', r.key, v.base_price + v_price, coalesce(v_supply, 0) + r.extra_supply;
    end if;
    update public.mall_builder_product_variants set extra_price = v_price where id = r.id;
  end loop;
  perform mall_builder_private.staff_log(v.store_id, 'variant_prices', 'product', v.id::text, left(v.name, 100));
end;
$$;

-- 주문 품목 공급가 = 상품 공급가 + 고른 조합의 추가 공급가(주문 때 값 그대로 저장 → 정산·공급사 주문 화면은 그대로)
create or replace function public.mall_builder_order_items_supplier()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_sid uuid; v_approval text; v_name text; v_store uuid; v_sup_status text; v_supply bigint; v_extra bigint;
begin
  select p.supplier_id, p.approval, p.name, p.store_id into v_sid, v_approval, v_name, v_store from public.mall_builder_products p where p.id = new.product_id;
  if v_sid is null then return new; end if;
  select x.status into v_sup_status from public.mall_builder_suppliers x where x.id = v_sid;
  if v_approval <> 'approved' or coalesce(v_sup_status, '') <> 'active' then
    raise exception '「%」은(는) 지금 판매하지 않는 상품입니다. 장바구니에서 빼 주세요.', v_name;
  end if;
  select s.supply_price into v_supply from public.mall_builder_product_supply s where s.product_id = new.product_id;
  if new.variant_id is not null then
    select vs.extra_supply into v_extra from public.mall_builder_variant_supply vs where vs.variant_id = new.variant_id;
  end if;
  insert into public.mall_builder_order_item_supply (order_item_id, order_id, store_id, supplier_id, supply_price)
  values (new.id, new.order_id, v_store, v_sid, coalesce(v_supply, 0) + coalesce(v_extra, 0));
  return new;
end;
$$;

-- ── B. 공급사별 배송비 ──
alter table public.mall_builder_shipping_policies add column if not exists supplier_id uuid references public.mall_builder_suppliers (id) on delete cascade;
create unique index if not exists mall_builder_shipping_policies_one_per_supplier on public.mall_builder_shipping_policies (supplier_id) where supplier_id is not null;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_shipping_policies_supplier_not_default') then
    alter table public.mall_builder_shipping_policies add constraint mall_builder_shipping_policies_supplier_not_default check (supplier_id is null or not is_default);
  end if;
end $c$;

-- 공급사 상품은 언제나 그 공급사의 배송비 정책(없으면 비워서 몰 기본 정책) — 운영자 상품 화면에서 바꿔도 이 값으로 돌아감
create or replace function public.mall_builder_products_supplier_ship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.supplier_id is not null then
    new.shipping_policy_id := (select sp.id from public.mall_builder_shipping_policies sp where sp.supplier_id = new.supplier_id);
  end if;
  return new;
end;
$$;
-- 이름 순서로 shipping_guard보다 먼저 돈다
drop trigger if exists mall_builder_products_aa_supplier_ship on public.mall_builder_products;
create trigger mall_builder_products_aa_supplier_ship before insert or update on public.mall_builder_products
  for each row execute function public.mall_builder_products_supplier_ship();

-- 배송비 정책 저장(공통). p = {type: 'mall'(몰 기본 따르기) | free | fixed | conditional, base_fee, free_over, jeju_fee, island_fee}
create or replace function mall_builder_private.supplier_shipping_apply(p_supplier uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  x public.mall_builder_suppliers%rowtype;
  v_type text := coalesce(p ->> 'type', 'mall');
  v_base bigint; v_over bigint; v_jeju bigint; v_island bigint;
  v_id uuid;
begin
  select * into x from public.mall_builder_suppliers s where s.id = p_supplier;
  if x.id is null then raise exception '공급사를 찾을 수 없습니다.'; end if;
  if v_type = 'mall' then
    delete from public.mall_builder_shipping_policies sp where sp.supplier_id = x.id;
    update public.mall_builder_products set updated_at = updated_at where supplier_id = x.id;
    return null;
  end if;
  if v_type not in ('free', 'fixed', 'conditional') then raise exception '배송비 방식을 확인해 주세요.'; end if;
  begin
    v_base := coalesce(nullif(p ->> 'base_fee', '')::bigint, 0);
    v_over := nullif(p ->> 'free_over', '')::bigint;
    v_jeju := coalesce(nullif(p ->> 'jeju_fee', '')::bigint, 0);
    v_island := coalesce(nullif(p ->> 'island_fee', '')::bigint, 0);
  exception when others then raise exception '배송비는 숫자로 적어 주세요.';
  end;
  if least(v_base, v_jeju, v_island, coalesce(v_over, 0)) < 0 or greatest(v_base, v_jeju, v_island) > 1000000 or coalesce(v_over, 0) > 100000000 then
    raise exception '배송비를 0원 이상으로 적어 주세요.';
  end if;
  if v_type = 'conditional' and v_over is null then raise exception '조건부 무료는 「얼마 이상 무료」 금액을 적어 주세요.'; end if;
  if v_type = 'free' then v_base := 0; v_over := null; end if;
  if v_type = 'fixed' then v_over := null; end if;
  insert into public.mall_builder_shipping_policies (store_id, supplier_id, name, type, base_fee, free_over, jeju_fee, island_fee, is_default)
  values (x.store_id, x.id, left(x.name, 26) || ' 배송', v_type, v_base, v_over, v_jeju, v_island, false)
  on conflict (supplier_id) where supplier_id is not null do update
    set name = excluded.name, type = excluded.type, base_fee = excluded.base_fee, free_over = excluded.free_over,
        jeju_fee = excluded.jeju_fee, island_fee = excluded.island_fee
  returning id into v_id;
  update public.mall_builder_products set updated_at = updated_at where supplier_id = x.id; -- 트리거가 정책을 붙임
  return v_id;
end;
$$;

-- 공급사 본인
create or replace function public.mall_builder_supplier_shipping_save(p_store_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sid uuid := public.mall_builder_my_supplier_id(p_store_id);
begin
  if auth.uid() is null or v_sid is null then raise exception '입점 중인 공급사만 배송비를 정할 수 있습니다.'; end if;
  return mall_builder_private.supplier_shipping_apply(v_sid, p);
end;
$$;

-- 운영자(상품 권한)
create or replace function public.mall_builder_supplier_shipping_set(p_supplier_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_store uuid; v_id uuid;
begin
  select s.store_id into v_store from public.mall_builder_suppliers s where s.id = p_supplier_id;
  if v_store is null or auth.uid() is null or not public.mall_builder_staff_can(v_store, 'products') then raise exception '공급사를 찾을 수 없습니다.'; end if;
  v_id := mall_builder_private.supplier_shipping_apply(p_supplier_id, p);
  perform mall_builder_private.staff_log(v_store, 'supplier_shipping', 'supplier', p_supplier_id::text, coalesce(p ->> 'type', 'mall'));
  return v_id;
end;
$$;

-- 주문별 공급사 배송비(주문 때 값 그대로) — 배송비가 저장될 때마다(주문·부분 취소) 다시 계산, 처음 값보다 늘지 않음
create table if not exists public.mall_builder_order_supplier_shipping (
  order_id uuid not null references public.mall_builder_orders (id) on delete cascade,
  supplier_id uuid not null references public.mall_builder_suppliers (id),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  amount bigint not null check (amount >= 0),
  primary key (order_id, supplier_id)
);
alter table public.mall_builder_order_supplier_shipping enable row level security;
create policy mall_builder_order_supplier_shipping_read on public.mall_builder_order_supplier_shipping for select
  using (public.mall_builder_staff_can(store_id, 'orders')
         or exists (select 1 from public.mall_builder_suppliers x where x.id = mall_builder_order_supplier_shipping.supplier_id and x.user_id = (select auth.uid())));

create or replace function public.mall_builder_orders_supplier_shipping()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_region text := public.mall_builder_region(coalesce(new.receiver ->> 'zip', ''));
  v_fee bigint;
begin
  for r in
    select sp.supplier_id, sp.type, sp.base_fee, sp.free_over, sp.jeju_fee, sp.island_fee,
           sum(i.unit_price * greatest(i.qty - i.cancelled_qty, 0))::bigint sub
      from public.mall_builder_order_items i join public.mall_builder_shipping_policies sp on sp.id = i.shipping_policy_id
     where i.order_id = new.id and sp.supplier_id is not null
     group by sp.supplier_id, sp.type, sp.base_fee, sp.free_over, sp.jeju_fee, sp.island_fee
  loop
    if r.sub <= 0 then
      v_fee := 0;
    else
      v_fee := case r.type when 'fixed' then r.base_fee
                           when 'conditional' then case when r.free_over is not null and r.sub >= r.free_over then 0 else r.base_fee end
                           else 0 end;
      if v_region = 'jeju' then v_fee := v_fee + r.jeju_fee; end if;
      if v_region = 'island' then v_fee := v_fee + r.island_fee; end if;
    end if;
    insert into public.mall_builder_order_supplier_shipping (order_id, supplier_id, store_id, amount)
    values (new.id, r.supplier_id, new.store_id, v_fee)
    on conflict (order_id, supplier_id) do update set amount = least(public.mall_builder_order_supplier_shipping.amount, excluded.amount);
  end loop;
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_supplier_shipping on public.mall_builder_orders;
create trigger mall_builder_orders_supplier_shipping after update of shipping_fee on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_supplier_shipping();

-- 정산(0056 교체): 구매 확정 때 공급가 합계 + 그 공급사 묶음 배송비
create or replace function public.mall_builder_orders_supplier_settle()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_earn public.mall_builder_supplier_ledger%rowtype;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'confirmed' then
    for r in
      select t.supplier_id, sum(t.supply)::bigint supply, sum(t.ship)::bigint ship from (
        select s.supplier_id, s.supply_price * greatest(i.qty - i.cancelled_qty, 0) supply, 0::bigint ship
          from public.mall_builder_order_item_supply s join public.mall_builder_order_items i on i.id = s.order_item_id
         where s.order_id = new.id
        union all
        select os.supplier_id, 0, os.amount from public.mall_builder_order_supplier_shipping os where os.order_id = new.id
      ) t group by t.supplier_id
    loop
      if r.supply + r.ship > 0 and not exists (select 1 from public.mall_builder_supplier_ledger l where l.order_id = new.id and l.supplier_id = r.supplier_id and l.kind = 'earn') then
        perform mall_builder_private.supplier_ledger_add(new.store_id, r.supplier_id, new.id, null, 'earn', r.supply + r.ship,
          '주문 ' || new.order_no || ' 구매 확정' || case when r.ship > 0 then ' (배송비 ' || r.ship || '원 포함)' else '' end);
      end if;
    end loop;
  elsif new.status in ('cancelled', 'returned') then
    for v_earn in select * from public.mall_builder_supplier_ledger l where l.order_id = new.id and l.kind = 'earn' loop
      if not exists (select 1 from public.mall_builder_supplier_ledger l where l.order_id = new.id and l.supplier_id = v_earn.supplier_id and l.kind = 'reclaim') then
        perform mall_builder_private.supplier_ledger_add(new.store_id, v_earn.supplier_id, new.id, null, 'reclaim', -v_earn.amount,
          '주문 ' || new.order_no || ' ' || public.mall_builder_status_label(new.status) || ' — 차감');
      end if;
    end loop;
  end if;
  return new;
end;
$$;

-- 몰 설정 복사(0051): 공급사 배송비 정책은 복사하지 않음
create or replace function pg_temp.swap(src text, a text, b text, what text) returns text language plpgsql as $f$
begin
  if (char_length(src) - char_length(replace(src, a, ''))) / char_length(a) <> 1 then raise exception '문구를 1번 찾지 못함: %', what; end if;
  return replace(src, a, b);
end $f$;
do $m$
declare src text;
begin
  src := pg_get_functiondef('public.mall_builder_copy_store_setup(uuid,uuid,text[])'::regprocedure);
  src := pg_temp.swap(src, 'from public.mall_builder_shipping_policies where store_id = p_from order by',
                           'from public.mall_builder_shipping_policies where store_id = p_from and supplier_id is null order by', '배송비 복사');
  execute src;
end $m$;

-- ── 권한 ──
revoke all on function public.mall_builder_supplier_options_save(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.mall_builder_variant_prices_set(uuid, jsonb) from public, anon;
revoke all on function public.mall_builder_supplier_shipping_save(uuid, jsonb) from public, anon;
revoke all on function public.mall_builder_supplier_shipping_set(uuid, jsonb) from public, anon;
revoke all on function public.mall_builder_products_supplier_ship() from public, anon, authenticated;
revoke all on function public.mall_builder_orders_supplier_shipping() from public, anon, authenticated;
revoke all on function mall_builder_private.default_extra_sale(bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function mall_builder_private.supplier_shipping_apply(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.mall_builder_supplier_options_save(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.mall_builder_variant_prices_set(uuid, jsonb) to authenticated;
grant execute on function public.mall_builder_supplier_shipping_save(uuid, jsonb) to authenticated;
grant execute on function public.mall_builder_supplier_shipping_set(uuid, jsonb) to authenticated;
