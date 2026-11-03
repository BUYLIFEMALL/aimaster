-- AI 쇼핑몰 빌더 F15 — 견적 요청 → 회신 → 주문 전환
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경. 적용은 둘로 나눔(docs/mall/LESSONS_LEARNED.md 점검 목록):
--   mall_builder_0013a_quote_tables(표·칸·보안 규칙) / mall_builder_0013b_quote_functions(함수 4개 — 지우기 문장 없음)
-- 견적 표는 손님·운영자 모두 직접 쓰지 못한다(쓰기 정책 없음). 요청·회신·거절·주문 전환 함수만 바꾼다.
-- 주문 전환은 견적가를 그대로 쓴다(등급가·구간 할인 다시 적용 안 함). 재고·판매 상태·배송비는 주문 때 다시 확인한다.

-- ── 0013a ──
create table if not exists public.mall_builder_quotes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  seq integer not null,
  quote_no text not null,
  user_id uuid not null references auth.users (id),
  customer_id uuid references public.mall_builder_store_customers (id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'answered', 'accepted', 'rejected')),
  request_note text not null default '' check (char_length(request_note) <= 500),
  answer_note text not null default '' check (char_length(answer_note) <= 500),
  valid_until date,
  order_id uuid references public.mall_builder_orders (id) on delete set null,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  closed_at timestamptz,
  unique (store_id, seq),
  unique (store_id, quote_no)
);
create index if not exists mall_builder_quotes_user on public.mall_builder_quotes (store_id, user_id, created_at desc);

create table if not exists public.mall_builder_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.mall_builder_quotes (id) on delete cascade,
  product_id uuid references public.mall_builder_products (id) on delete set null,
  variant_id uuid references public.mall_builder_product_variants (id) on delete set null,
  name_snapshot text not null,
  option_snapshot text not null default '',
  qty integer not null check (qty between 1 and 999),
  ref_unit_price bigint, -- 요청 때 판매가 + 옵션 추가금(운영자 참고용)
  quoted_price bigint check (quoted_price is null or quoted_price between 0 and 1000000000)
);
create index if not exists mall_builder_quote_items_quote on public.mall_builder_quote_items (quote_id);

alter table public.mall_builder_orders add column if not exists quote_id uuid references public.mall_builder_quotes (id) on delete set null;

alter table public.mall_builder_quotes enable row level security;
alter table public.mall_builder_quote_items enable row level security;
create policy "mall_builder_quotes_read" on public.mall_builder_quotes
  for select using (user_id = (select auth.uid()) or public.mall_builder_is_store_staff(store_id));
create policy "mall_builder_quote_items_read" on public.mall_builder_quote_items
  for select using (exists (
    select 1 from public.mall_builder_quotes q where q.id = quote_id and (q.user_id = (select auth.uid()) or public.mall_builder_is_store_staff(q.store_id))
  ));

-- ── 0013b ── (아래 함수 본문 = 실제 적용본, 확인 창 없이 바로 적용됨)
-- 함수 정의만 추가한다(create or replace). 지금 바뀌거나 지워지는 데이터는 없다. 함수 안에 delete 문장도 없다.

-- 손님: 장바구니(이 몰)를 견적 요청서로 복사. 장바구니는 그대로 둔다
create or replace function public.mall_builder_request_quote(p_store_id uuid, p_note text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_customer public.mall_builder_store_customers%rowtype;
  v_seq integer;
  v_quote uuid;
  v_count integer;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  perform 1 from public.mall_builder_stores s where s.id = p_store_id and s.status = 'active' for update;
  if not found then raise exception '견적을 요청할 수 없는 몰입니다.'; end if;
  select * into v_customer from public.mall_builder_store_customers c where c.store_id = p_store_id and c.user_id = v_uid;
  if not found then raise exception '이 몰에 가입한 뒤 견적을 요청할 수 있습니다.'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception '요청 메모는 500자 이내로 입력해 주세요.'; end if;
  select count(*) into v_count from public.mall_builder_cart_items ci
    join public.mall_builder_products p on p.id = ci.product_id
    where ci.store_id = p_store_id and ci.user_id = v_uid and p.status in ('on_sale', 'sold_out');
  if v_count = 0 then raise exception '장바구니에 견적 받을 상품이 없습니다.'; end if;

  select coalesce(max(q.seq), 0) + 1 into v_seq from public.mall_builder_quotes q where q.store_id = p_store_id;
  insert into public.mall_builder_quotes (store_id, seq, quote_no, user_id, customer_id, request_note)
  values (p_store_id, v_seq, 'Q' || to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0'),
          v_uid, v_customer.id, coalesce(btrim(p_note), ''))
  returning id into v_quote;
  insert into public.mall_builder_quote_items (quote_id, product_id, variant_id, name_snapshot, option_snapshot, qty, ref_unit_price)
  select v_quote, p.id, v.id, p.name, coalesce(v.key, ''), ci.qty, p.base_price + coalesce(v.extra_price, 0)
    from public.mall_builder_cart_items ci
    join public.mall_builder_products p on p.id = ci.product_id
    left join public.mall_builder_product_variants v on v.id = ci.variant_id
    where ci.store_id = p_store_id and ci.user_id = v_uid and p.status in ('on_sale', 'sold_out')
    order by ci.created_at;
  return v_quote;
end;
$$;

-- 운영자: 품목별 견적가·유효기한·메모로 회신(수락 전이면 다시 회신 가능)
create or replace function public.mall_builder_answer_quote(p_quote_id uuid, p_items jsonb, p_valid_until date, p_note text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_quote public.mall_builder_quotes%rowtype;
  v_total integer;
  v_set integer;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_quote from public.mall_builder_quotes q where q.id = p_quote_id for update;
  if not found or not public.mall_builder_is_store_staff(v_quote.store_id) then raise exception '이 견적에 회신할 권한이 없습니다.'; end if;
  if v_quote.status not in ('requested', 'answered') then raise exception '이미 끝난 견적입니다.'; end if;
  if p_valid_until is null or p_valid_until < (now() at time zone 'Asia/Seoul')::date then raise exception '유효기한은 오늘 이후로 정해 주세요.'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception '회신 메모는 500자 이내로 입력해 주세요.'; end if;
  update public.mall_builder_quote_items i set quoted_price = (x ->> 'price')::bigint
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) x
    where i.quote_id = p_quote_id and i.id = (x ->> 'id')::uuid
      and (x ->> 'price') ~ '^[0-9]+$' and (x ->> 'price')::bigint <= 1000000000;
  select count(*), count(quoted_price) into v_total, v_set from public.mall_builder_quote_items where quote_id = p_quote_id;
  if v_set < v_total then raise exception '모든 품목에 견적가를 넣어 주세요.'; end if;
  update public.mall_builder_quotes set status = 'answered', valid_until = p_valid_until, answer_note = coalesce(btrim(p_note), ''), answered_at = now()
    where id = p_quote_id;
  return 'answered';
end;
$$;

-- 손님: 견적 거절(요청 중이거나 회신받은 견적)
create or replace function public.mall_builder_reject_quote(p_quote_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_quote public.mall_builder_quotes%rowtype;
begin
  select * into v_quote from public.mall_builder_quotes q where q.id = p_quote_id for update;
  if not found or v_quote.user_id is distinct from auth.uid() then raise exception '이 견적을 바꿀 권한이 없습니다.'; end if;
  if v_quote.status not in ('requested', 'answered') then raise exception '이미 끝난 견적입니다.'; end if;
  update public.mall_builder_quotes set status = 'rejected', closed_at = now() where id = p_quote_id;
  return 'rejected';
end;
$$;

-- 손님: 회신받은 견적을 견적가 그대로 주문(입금 대기)으로. 유효기한·재고·판매 상태·배송비는 지금 다시 확인
create or replace function public.mall_builder_order_from_quote(
  p_quote_id uuid, p_address_id uuid, p_depositor text, p_memo text, p_expected_total bigint
) returns table (order_id uuid, order_no text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_quote public.mall_builder_quotes%rowtype;
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
  v_avail integer;
  v_key text;
  v_groups jsonb := '{}'::jsonb;
  v_subtotal bigint := 0;
  v_ship bigint := 0;
  v_policy public.mall_builder_shipping_policies%rowtype;
  v_fee bigint;
  v_info jsonb;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_quote from public.mall_builder_quotes q where q.id = p_quote_id for update;
  if not found or v_quote.user_id <> v_uid then raise exception '견적을 찾을 수 없습니다.'; end if;
  if v_quote.status <> 'answered' then raise exception '회신받은 견적만 주문할 수 있습니다.'; end if;
  if v_quote.valid_until < (now() at time zone 'Asia/Seoul')::date then raise exception '유효기한이 지난 견적입니다. 다시 요청해 주세요.'; end if;
  select * into v_store from public.mall_builder_stores s where s.id = v_quote.store_id and s.status = 'active' for update;
  if not found then raise exception '주문할 수 없는 몰입니다.'; end if;
  select * into v_customer from public.mall_builder_store_customers c where c.store_id = v_quote.store_id and c.user_id = v_uid;
  if not found then raise exception '이 몰에 가입한 뒤 주문할 수 있습니다.'; end if;
  select * into v_addr from public.mall_builder_customer_addresses a where a.id = p_address_id and a.customer_id = v_customer.id;
  if not found then raise exception '배송지를 골라 주세요.'; end if;
  if char_length(btrim(coalesce(p_depositor, ''))) not between 1 and 20 then raise exception '입금자명을 1~20자로 입력해 주세요.'; end if;
  if char_length(coalesce(p_memo, '')) > 200 then raise exception '배송 메모는 200자 이내로 입력해 주세요.'; end if;

  perform 1 from public.mall_builder_products p
    where p.id in (select i.product_id from public.mall_builder_quote_items i where i.quote_id = p_quote_id) order by p.id for update;
  perform 1 from public.mall_builder_product_variants v
    where v.id in (select i.variant_id from public.mall_builder_quote_items i where i.quote_id = p_quote_id) order by v.id for update;

  v_region := public.mall_builder_region(v_addr.zip);
  select sp.id into v_default from public.mall_builder_shipping_policies sp where sp.store_id = v_quote.store_id and sp.is_default;
  select coalesce(max(o.seq), 0) + 1 into v_seq from public.mall_builder_orders o where o.store_id = v_quote.store_id;
  v_no := to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');
  v_info := coalesce(v_store.business_info, '{}'::jsonb);

  insert into public.mall_builder_orders (store_id, seq, order_no, user_id, customer_id, receiver, depositor, bank, memo, quote_id)
  values (
    v_quote.store_id, v_seq, v_no, v_uid, v_customer.id,
    jsonb_build_object('label', v_addr.label, 'receiver', v_addr.receiver, 'phone', v_addr.phone, 'zip', v_addr.zip, 'addr1', v_addr.addr1, 'addr2', v_addr.addr2, 'region', v_region),
    btrim(p_depositor),
    jsonb_build_object('bank_name', v_info ->> 'bank_name', 'bank_account', v_info ->> 'bank_account', 'bank_holder', v_info ->> 'bank_holder'),
    coalesce(p_memo, ''), p_quote_id
  ) returning id into v_order;

  for v_line in
    select i.qty, i.quoted_price, i.name_snapshot, i.option_snapshot,
           p.id as product_id, p.status, p.stock_mode, p.stock, p.option_groups, p.images, p.shipping_policy_id,
           v.id as variant_id, v.stock as variant_stock, v.is_active
    from public.mall_builder_quote_items i
    left join public.mall_builder_products p on p.id = i.product_id
    left join public.mall_builder_product_variants v on v.id = i.variant_id
    where i.quote_id = p_quote_id
  loop
    if v_line.product_id is null then raise exception '「%」 상품이 삭제되어 주문할 수 없습니다.', v_line.name_snapshot; end if;
    if v_line.status = 'sold_out' then raise exception '「%」은(는) 품절된 상품입니다.', v_line.name_snapshot; end if;
    if v_line.status <> 'on_sale' then raise exception '「%」은(는) 지금 판매하지 않는 상품입니다.', v_line.name_snapshot; end if;
    v_has_opt := jsonb_array_length(coalesce(v_line.option_groups, '[]'::jsonb)) > 0;
    if v_has_opt and (v_line.variant_id is null or not v_line.is_active) then raise exception '「% %」 옵션은 판매하지 않습니다.', v_line.name_snapshot, v_line.option_snapshot; end if;
    if v_line.stock_mode = 'product' then
      v_avail := case when v_has_opt then v_line.variant_stock else v_line.stock end;
      if v_avail <= 0 then raise exception '「%」은(는) 품절입니다.', v_line.name_snapshot; end if;
      if v_line.qty > v_avail then raise exception '「%」 재고가 %개 남았습니다.', v_line.name_snapshot, v_avail; end if;
      if v_has_opt then
        update public.mall_builder_product_variants set stock = stock - v_line.qty where id = v_line.variant_id;
      else
        update public.mall_builder_products set stock = stock - v_line.qty where id = v_line.product_id;
      end if;
    end if;
    insert into public.mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, image_url, unit_price, qty, line_total, price_breakdown, shipping_policy_id)
    values (v_order, v_line.product_id, v_line.variant_id, v_line.name_snapshot, v_line.option_snapshot, v_line.images -> 0 ->> 'url',
            v_line.quoted_price, v_line.qty, v_line.quoted_price * v_line.qty,
            jsonb_build_array(jsonb_build_object('label', '견적가(' || v_quote.quote_no || ')', 'amount', v_line.quoted_price)),
            coalesce(v_line.shipping_policy_id, v_default));
    v_subtotal := v_subtotal + v_line.quoted_price * v_line.qty;
    v_key := coalesce(coalesce(v_line.shipping_policy_id, v_default)::text, 'none');
    v_groups := jsonb_set(v_groups, array[v_key], to_jsonb(coalesce((v_groups ->> v_key)::bigint, 0) + v_line.quoted_price * v_line.qty));
  end loop;

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
    raise exception '금액이 바뀌었습니다. 다시 확인해 주세요. (현재 %원)', to_char(v_subtotal + v_ship, 'FM999,999,999,999');
  end if;
  update public.mall_builder_orders set subtotal = v_subtotal, shipping_fee = v_ship, total = v_subtotal + v_ship where id = v_order;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (v_order, null, 'pending_payment', v_uid, 'customer', '견적 ' || v_quote.quote_no || ' 주문 전환(무통장 입금 대기)');
  update public.mall_builder_quotes set status = 'accepted', order_id = v_order, closed_at = now() where id = p_quote_id;
  return query select v_order, v_no;
end;
$$;
