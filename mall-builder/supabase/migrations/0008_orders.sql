-- AI 쇼핑몰 빌더 F10 — 주문서·무통장 주문 생성
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(확인 창 방지)
-- 주문 표에는 손님·운영자 누구도 직접 쓰지 못한다(쓰기 정책 없음). 주문은 검사 후 기록하는 함수 mall_builder_place_order만 만든다.
-- 금액은 화면 값을 믿지 않고 함수 안에서 다시 계산한다 — 계산 규칙은 src/lib/pricing.ts·shipping.ts와 같아야 한다(시험으로 대조).

create table if not exists public.mall_builder_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  seq integer not null,
  order_no text not null,
  user_id uuid not null references auth.users (id),
  customer_id uuid references public.mall_builder_store_customers (id) on delete set null,
  status text not null default 'pending_payment' check (status in (
    'pending_payment', 'paid', 'preparing', 'shipping', 'delivered', 'confirmed',
    'cancel_requested', 'cancelled', 'return_requested', 'returned')),
  pay_method text not null default 'bank' check (pay_method in ('bank')),
  subtotal bigint not null default 0,
  shipping_fee bigint not null default 0,
  total bigint not null default 0,
  receiver jsonb not null, -- 주문 당시 배송지 그대로(나중에 배송지를 고쳐도 바뀌지 않음)
  depositor text not null check (char_length(btrim(depositor)) between 1 and 20),
  bank jsonb not null default '{}'::jsonb, -- 주문 당시 입금 계좌
  memo text not null default '' check (char_length(memo) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, seq),
  unique (store_id, order_no)
);
create index if not exists mall_builder_orders_user on public.mall_builder_orders (store_id, user_id, created_at desc);
create index if not exists mall_builder_orders_store on public.mall_builder_orders (store_id, created_at desc);

create table if not exists public.mall_builder_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.mall_builder_orders (id) on delete cascade,
  product_id uuid references public.mall_builder_products (id) on delete set null,
  variant_id uuid references public.mall_builder_product_variants (id) on delete set null,
  name_snapshot text not null,
  option_snapshot text not null default '',
  image_url text,
  unit_price bigint not null,
  qty integer not null check (qty between 1 and 999),
  line_total bigint not null,
  price_breakdown jsonb not null default '[]'::jsonb,
  shipping_policy_id uuid
);
create index if not exists mall_builder_order_items_order on public.mall_builder_order_items (order_id);

create table if not exists public.mall_builder_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.mall_builder_orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid,
  actor_role text not null check (actor_role in ('customer', 'staff', 'system')),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_order_events_order on public.mall_builder_order_events (order_id, created_at);

alter table public.mall_builder_orders enable row level security;
alter table public.mall_builder_order_items enable row level security;
alter table public.mall_builder_order_events enable row level security;
-- 보기만: 주문한 손님 본인 + 그 몰 운영자. 쓰기 정책은 두지 않는다
create policy "mall_builder_orders_read" on public.mall_builder_orders
  for select using (user_id = (select auth.uid()) or public.mall_builder_is_store_staff(store_id));
create policy "mall_builder_order_items_read" on public.mall_builder_order_items
  for select using (exists (
    select 1 from public.mall_builder_orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.mall_builder_is_store_staff(o.store_id))
  ));
create policy "mall_builder_order_events_read" on public.mall_builder_order_events
  for select using (exists (
    select 1 from public.mall_builder_orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.mall_builder_is_store_staff(o.store_id))
  ));

-- 우편번호 → 지역(src/lib/shipping.ts regionOfZip과 같은 범위)
create or replace function public.mall_builder_region(p_zip text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_zip !~ '^[0-9]{5}$' then 'mainland'
    when p_zip::int between 63000 and 63644 then 'jeju'
    when exists (
      select 1 from (values
        (40200, 40240), (23004, 23010), (23100, 23136), (32133, 32133), (33411, 33411), (52570, 52571),
        (53031, 53033), (53089, 53104), (56347, 56349), (57068, 57069), (58760, 58762), (58800, 58866),
        (58953, 58958), (59102, 59103), (59127, 59127), (59137, 59166), (59421, 59421), (59531, 59531),
        (59551, 59551), (59563, 59563), (59568, 59568), (59650, 59650), (59766, 59766), (59781, 59790)
      ) r(a, b) where p_zip::int between r.a and r.b
    ) then 'island'
    else 'mainland'
  end
$$;

-- 주문 만들기: 장바구니 → 주문(입금대기). 금액·재고를 여기서 다시 계산·검사하고, 재고를 줄이고, 장바구니를 비운다
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
  v_region text;
  v_default uuid;
  v_order uuid;
  v_seq integer;
  v_no text;
  v_line record;
  v_has_opt boolean;
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
  -- 몰 줄을 잠가 주문 번호가 겹치지 않게
  select * into v_store from public.mall_builder_stores s where s.id = p_store_id and s.status = 'active' for update;
  if not found then raise exception '주문할 수 없는 몰입니다.'; end if;
  select * into v_customer from public.mall_builder_store_customers c where c.store_id = p_store_id and c.user_id = v_uid;
  if not found then raise exception '이 몰에 가입한 뒤 주문할 수 있습니다.'; end if;
  select * into v_addr from public.mall_builder_customer_addresses a where a.id = p_address_id and a.customer_id = v_customer.id;
  if not found then raise exception '배송지를 골라 주세요.'; end if;
  if char_length(btrim(coalesce(p_depositor, ''))) not between 1 and 20 then raise exception '입금자명을 1~20자로 입력해 주세요.'; end if;
  if char_length(coalesce(p_memo, '')) > 200 then raise exception '배송 메모는 200자 이내로 입력해 주세요.'; end if;

  -- 판매가 끝난(준비 중·숨김) 상품은 손님 장바구니에 보이지 않으므로 조용히 뺀다
  delete from public.mall_builder_cart_items ci
    using public.mall_builder_products p
    where ci.product_id = p.id and ci.store_id = p_store_id and ci.user_id = v_uid and p.status in ('draft', 'hidden');

  -- 재고를 바꿀 상품·옵션을 먼저 잠근다(동시에 주문해도 재고가 음수가 되지 않게)
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
           v.id as variant_id, v.key as variant_key, v.extra_price, v.stock as variant_stock, v.is_active
    from public.mall_builder_cart_items ci
    join public.mall_builder_products p on p.id = ci.product_id
    left join public.mall_builder_product_variants v on v.id = ci.variant_id
    where ci.store_id = p_store_id and ci.user_id = v_uid
    order by ci.created_at
  loop
    v_count := v_count + 1;
    -- pricing.ts priceLine과 같은 순서: 판매 상태 → 옵션 → 기준가 → 수량·재고
    if v_line.status = 'sold_out' then raise exception '「%」은(는) 품절된 상품입니다.', v_line.name; end if;
    if v_line.status <> 'on_sale' then raise exception '「%」은(는) 지금 판매하지 않는 상품입니다.', v_line.name; end if;
    v_has_opt := jsonb_array_length(coalesce(v_line.option_groups, '[]'::jsonb)) > 0;
    if v_has_opt and v_line.variant_id is null then raise exception '「%」의 옵션을 선택해 주세요.', v_line.name; end if;
    if not v_has_opt and v_line.variant_id is not null then raise exception '「%」은(는) 옵션이 없는 상품입니다.', v_line.name; end if;
    if v_line.variant_id is not null and not v_line.is_active then raise exception '「% %」 옵션은 판매하지 않습니다.', v_line.name, v_line.variant_key; end if;

    v_unit := greatest(0, v_line.base_price + (case when v_has_opt then coalesce(v_line.extra_price, 0) else 0 end));
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
    insert into public.mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, image_url, unit_price, qty, line_total, price_breakdown, shipping_policy_id)
    values (v_order, v_line.product_id, v_line.variant_id, v_line.name, coalesce(v_line.variant_key, ''), v_line.images -> 0 ->> 'url',
            v_unit, v_line.qty, v_unit * v_line.qty, v_breakdown, coalesce(v_line.shipping_policy_id, v_default));

    v_subtotal := v_subtotal + v_unit * v_line.qty;
    v_key := coalesce(coalesce(v_line.shipping_policy_id, v_default)::text, 'none');
    v_groups := jsonb_set(v_groups, array[v_key], to_jsonb(coalesce((v_groups ->> v_key)::bigint, 0) + v_unit * v_line.qty));
  end loop;
  if v_count = 0 then raise exception '장바구니가 비어 있습니다.'; end if;

  -- 배송비: 같은 정책끼리 묶어 묶음마다 한 번(shipping.ts computeShipping과 같음)
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

-- 실행 권한은 기본값 그대로(비로그인은 함수 첫 줄에서 「로그인이 필요합니다」로 거절).
-- 권한 회수(revoke) 문장은 DB 도구의 확인 창을 띄워 적용이 만료되므로 넣지 않았다(2026-11-03, 추가만 하는 변경 원칙).
-- 실제 적용은 두 번으로 나눔: mall_builder_0008a_order_tables(표·보안 규칙·지역 함수), mall_builder_0008b_place_order(주문 함수)
