-- AI 쇼핑몰 빌더 D15 — 비회원 주문
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(docs/mall/LESSONS_LEARNED.md 점검 목록).
-- 적용은 셋으로 나눔: 0035a 주문 표 칸·검사 제약 / 0035b 비회원 함수 5개(해시·주문·조회·주문 읽기·상태 변경) / 0035c 알림 트리거·통계 다시 정의(아래 「알림」부터)
-- 비회원 주문은 user_id 없이 is_guest=true + 이름·휴대폰(·이메일). 조회는 비밀 토큰(DB엔 sha256 해시)으로만 — 표 읽기 규칙은 그대로(user_id = auth.uid()는 비회원 줄에 절대 맞지 않음).
-- 무통장 입금만(카드·외상·등급가는 가입 손님만). 지우기 문장 없음.

-- ── 0035a ──
alter table public.mall_builder_orders alter column user_id drop not null;
alter table public.mall_builder_orders
  add column if not exists is_guest boolean not null default false,
  add column if not exists guest_name text,
  add column if not exists guest_phone text,
  add column if not exists guest_email text,
  add column if not exists guest_token_hash text;
alter table public.mall_builder_orders add constraint mall_builder_orders_guest_check
  check ((is_guest and user_id is null and guest_name is not null and guest_phone is not null) or (not is_guest and user_id is not null));
create index if not exists mall_builder_orders_guest_token on public.mall_builder_orders (guest_token_hash) where guest_token_hash is not null;
create index if not exists mall_builder_orders_store_no on public.mall_builder_orders (store_id, order_no);

-- ── 0035b ──
-- 함수 정의만 만들거나 다시 정의한다. 지금 지워지는 데이터는 없다(함수 안에도 delete 문장 없음).

create or replace function public.mall_builder_guest_hash(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

-- 비회원 주문(무통장): 줄 목록은 [{product_id, variant_id, qty}], 몰이 비회원 주문을 켰을 때만. 등급가 없음(보는 사람 = 비회원)
create or replace function public.mall_builder_place_guest_order(
  p_store_id uuid, p_lines jsonb, p_guest jsonb, p_receiver jsonb, p_depositor text, p_memo text, p_expected_total bigint
) returns jsonb language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_store public.mall_builder_stores%rowtype;
  v_name text := btrim(coalesce(p_guest ->> 'name', ''));
  v_phone text := btrim(coalesce(p_guest ->> 'phone', ''));
  v_email text := nullif(lower(btrim(coalesce(p_guest ->> 'email', ''))), '');
  v_region text;
  v_default uuid;
  v_order uuid;
  v_seq integer;
  v_no text;
  v_token text;
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
  select * into v_store from public.mall_builder_stores s where s.id = p_store_id and s.status = 'active' for update;
  if not found then raise exception '주문할 수 없는 몰입니다.'; end if;
  if coalesce(v_store.settings -> 'guest_order', 'false'::jsonb) <> 'true'::jsonb then raise exception '이 몰은 비회원 주문을 받지 않습니다. 가입 후 주문해 주세요.'; end if;
  if char_length(v_name) not between 1 and 30 then raise exception '주문하는 분 이름을 1~30자로 입력해 주세요.'; end if;
  if v_phone !~ '^01[016789]-[0-9]{3,4}-[0-9]{4}$' then raise exception '휴대폰 번호를 확인해 주세요(예: 010-1234-5678).'; end if;
  if v_email is not null and (char_length(v_email) > 100 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception '이메일 주소를 확인해 주세요.'; end if;
  if char_length(btrim(coalesce(p_receiver ->> 'receiver', ''))) not between 1 and 30 then raise exception '받는 분 이름을 입력해 주세요.'; end if;
  if coalesce(p_receiver ->> 'phone', '') !~ '^01[016789]-[0-9]{3,4}-[0-9]{4}$' then raise exception '받는 분 휴대폰 번호를 확인해 주세요.'; end if;
  if coalesce(p_receiver ->> 'zip', '') !~ '^[0-9]{5}$' then raise exception '우편번호 5자리를 입력해 주세요.'; end if;
  if char_length(btrim(coalesce(p_receiver ->> 'addr1', ''))) not between 2 and 120 then raise exception '주소를 입력해 주세요.'; end if;
  if char_length(coalesce(p_receiver ->> 'addr2', '')) > 120 then raise exception '상세 주소는 120자 이내로 입력해 주세요.'; end if;
  if char_length(btrim(coalesce(p_depositor, ''))) not between 1 and 20 then raise exception '입금자명을 1~20자로 입력해 주세요.'; end if;
  if char_length(coalesce(p_memo, '')) > 200 then raise exception '배송 메모는 200자 이내로 입력해 주세요.'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 20 then raise exception '장바구니가 비어 있거나 20줄을 넘습니다.'; end if;

  perform 1 from public.mall_builder_products p
    where p.id in (select (l ->> 'product_id')::uuid from jsonb_array_elements(p_lines) l where l ->> 'product_id' ~ '^[0-9a-f-]{36}$')
    order by p.id for update;
  perform 1 from public.mall_builder_product_variants v
    where v.id in (select (l ->> 'variant_id')::uuid from jsonb_array_elements(p_lines) l where l ->> 'variant_id' ~ '^[0-9a-f-]{36}$')
    order by v.id for update;

  v_region := public.mall_builder_region(p_receiver ->> 'zip');
  select sp.id into v_default from public.mall_builder_shipping_policies sp where sp.store_id = p_store_id and sp.is_default;
  select coalesce(max(o.seq), 0) + 1 into v_seq from public.mall_builder_orders o where o.store_id = p_store_id;
  v_no := to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');
  v_info := coalesce(v_store.business_info, '{}'::jsonb);
  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  insert into public.mall_builder_orders (store_id, seq, order_no, user_id, customer_id, is_guest, guest_name, guest_phone, guest_email, guest_token_hash, receiver, depositor, bank, memo)
  values (
    p_store_id, v_seq, v_no, null, null, true, v_name, v_phone, v_email, public.mall_builder_guest_hash(v_token),
    jsonb_build_object('label', '비회원', 'receiver', btrim(p_receiver ->> 'receiver'), 'phone', p_receiver ->> 'phone', 'zip', p_receiver ->> 'zip',
                       'addr1', btrim(p_receiver ->> 'addr1'), 'addr2', coalesce(p_receiver ->> 'addr2', ''), 'region', v_region),
    btrim(p_depositor),
    jsonb_build_object('bank_name', v_info ->> 'bank_name', 'bank_account', v_info ->> 'bank_account', 'bank_holder', v_info ->> 'bank_holder'),
    coalesce(p_memo, '')
  ) returning id into v_order;

  for v_line in
    select (l.item ->> 'qty')::integer as qty, p.id as product_id, p.name, p.status, p.base_price, p.stock_mode, p.stock, p.option_groups, p.images, p.shipping_policy_id,
           p.visibility, p.price_visibility, p.moq, p.order_unit, p.max_qty,
           v.id as variant_id, v.key as variant_key, v.extra_price, v.stock as variant_stock, v.is_active
    from jsonb_array_elements(p_lines) with ordinality as l(item, ord)
    join public.mall_builder_products p on p.id = (l.item ->> 'product_id')::uuid and p.store_id = p_store_id
    left join public.mall_builder_product_variants v on v.id = (l.item ->> 'variant_id')::uuid and v.product_id = p.id
    where p.status not in ('draft', 'hidden')
    order by l.ord
  loop
    v_count := v_count + 1;
    if v_line.qty is null or v_line.qty < 1 or v_line.qty > 999 then raise exception '「%」 수량이 올바르지 않습니다.', v_line.name; end if;
    if v_line.visibility = 'business_only' then raise exception '「%」은(는) 사업자 회원 전용 상품입니다. 가입 후 주문해 주세요.', v_line.name; end if;
    if v_line.visibility = 'members' then raise exception '「%」은(는) 로그인 후 구매할 수 있는 상품입니다.', v_line.name; end if;
    if v_line.price_visibility in ('login', 'approved_business') then raise exception '「%」은(는) 비회원에게 가격이 공개되지 않는 상품입니다. 가입 후 주문해 주세요.', v_line.name; end if;
    if v_line.status = 'sold_out' then raise exception '「%」은(는) 품절된 상품입니다.', v_line.name; end if;
    if v_line.status <> 'on_sale' then raise exception '「%」은(는) 지금 판매하지 않는 상품입니다.', v_line.name; end if;
    v_has_opt := jsonb_array_length(coalesce(v_line.option_groups, '[]'::jsonb)) > 0;
    if v_has_opt and v_line.variant_id is null then raise exception '「%」의 옵션을 선택해 주세요.', v_line.name; end if;
    if not v_has_opt and v_line.variant_id is not null then raise exception '「%」은(는) 옵션이 없는 상품입니다.', v_line.name; end if;
    if v_line.variant_id is not null and not v_line.is_active then raise exception '「% %」 옵션은 판매하지 않습니다.', v_line.name, v_line.variant_key; end if;

    v_extra := case when v_has_opt then coalesce(v_line.extra_price, 0) else 0 end;
    v_base := v_line.base_price + v_extra;
    v_unit := greatest(0, v_base);
    v_breakdown := jsonb_build_array(jsonb_build_object('label', '판매가', 'amount', v_line.base_price));
    if v_extra <> 0 then
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '옵션 추가금', 'amount', v_extra));
    end if;

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
  if v_count <> jsonb_array_length(p_lines) then raise exception '주문할 수 없는 상품이 있습니다. 장바구니를 확인해 주세요.'; end if;

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
  values (v_order, null, 'pending_payment', null, 'customer', '비회원 주문 접수(무통장 입금 대기)');
  return jsonb_build_object('order_id', v_order, 'order_no', v_no, 'token', v_token);
end;
$$;

-- 주문 조회: 주문번호 + 주문할 때 적은 휴대폰 → 새 토큰(옛 토큰은 무효)
create or replace function public.mall_builder_guest_lookup(p_store_id uuid, p_order_no text, p_phone text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order uuid;
  v_token text;
begin
  if coalesce(p_order_no, '') !~ '^[0-9]{8}-[0-9]{4}$' or coalesce(p_phone, '') !~ '^01[016789]-[0-9]{3,4}-[0-9]{4}$' then
    raise exception '주문번호와 휴대폰 번호를 확인해 주세요.';
  end if;
  select o.id into v_order from public.mall_builder_orders o
   where o.store_id = p_store_id and o.order_no = p_order_no and o.is_guest and o.guest_phone = p_phone;
  if v_order is null then raise exception '주문을 찾지 못했습니다. 주문번호와 휴대폰 번호를 다시 확인해 주세요.'; end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  update public.mall_builder_orders set guest_token_hash = public.mall_builder_guest_hash(v_token), updated_at = now() where id = v_order;
  return jsonb_build_object('order_id', v_order, 'token', v_token);
end;
$$;

-- 토큰으로 비회원 주문 하나(품목·기록 포함)
create or replace function public.mall_builder_guest_order(p_store_id uuid, p_order_id uuid, p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then return null; end if;
  select * into o from public.mall_builder_orders x
   where x.id = p_order_id and x.store_id = p_store_id and x.is_guest and x.guest_token_hash = public.mall_builder_guest_hash(p_token);
  if o.id is null then return null; end if;
  return jsonb_build_object(
    'order', jsonb_build_object(
      'id', o.id, 'order_no', o.order_no, 'status', o.status, 'subtotal', o.subtotal, 'shipping_fee', o.shipping_fee, 'total', o.total,
      'receiver', o.receiver, 'depositor', o.depositor, 'bank', o.bank, 'memo', o.memo, 'courier', o.courier, 'tracking_no', o.tracking_no,
      'is_credit', o.is_credit, 'is_card', o.is_card, 'tax_invoice', o.tax_invoice, 'pay_deadline_at', o.pay_deadline_at, 'created_at', o.created_at,
      'is_guest', true, 'guest_name', o.guest_name, 'guest_phone', o.guest_phone, 'guest_email', o.guest_email),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'product_id', i.product_id, 'name_snapshot', i.name_snapshot, 'option_snapshot', i.option_snapshot,
                        'image_url', i.image_url, 'unit_price', i.unit_price, 'qty', i.qty, 'line_total', i.line_total, 'cancelled_qty', i.cancelled_qty) order by i.id)
                       from public.mall_builder_order_items i where i.order_id = o.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'from_status', e.from_status, 'to_status', e.to_status, 'actor_role', e.actor_role, 'note', e.note, 'created_at', e.created_at) order by e.created_at)
                        from public.mall_builder_order_events e where e.order_id = o.id), '[]'::jsonb)
  );
end;
$$;

-- 비회원 손님의 상태 변경(가입 손님과 같은 이동표: 입금 전 취소·취소 요청·구매 확정·반품 요청). 취소면 재고 되돌림
create or replace function public.mall_builder_guest_change_status(p_store_id uuid, p_order_id uuid, p_token text, p_to text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_order public.mall_builder_orders%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then raise exception '주문 조회가 만료되었습니다. 주문번호와 휴대폰 번호로 다시 조회해 주세요.'; end if;
  select * into v_order from public.mall_builder_orders o
   where o.id = p_order_id and o.store_id = p_store_id and o.is_guest and o.guest_token_hash = public.mall_builder_guest_hash(p_token) for update;
  if not found then raise exception '주문을 찾지 못했습니다. 다시 조회해 주세요.'; end if;
  if not public.mall_builder_transition_allowed('customer', v_order.status, p_to) then
    raise exception '「%」 상태에서 「%」(으)로 바꿀 수 없습니다.', public.mall_builder_status_label(v_order.status), public.mall_builder_status_label(p_to);
  end if;
  if p_to in ('cancelled', 'returned') then
    update public.mall_builder_product_variants v set stock = v.stock + (i.qty - i.cancelled_qty)
      from public.mall_builder_order_items i
      where i.order_id = p_order_id and i.stock_deducted and i.variant_id is not null and v.id = i.variant_id;
    update public.mall_builder_products p set stock = p.stock + (i.qty - i.cancelled_qty)
      from public.mall_builder_order_items i
      where i.order_id = p_order_id and i.stock_deducted and i.variant_id is null and p.id = i.product_id;
    update public.mall_builder_order_items i set stock_deducted = false where i.order_id = p_order_id and i.stock_deducted;
  end if;
  update public.mall_builder_orders o set status = p_to, updated_at = now() where o.id = p_order_id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (p_order_id, v_order.status, p_to, null, 'customer', '비회원');
  return p_to;
end;
$$;

-- 알림(0028 + 비회원): 메일 주소는 비회원 이메일 → 없으면 로그인 계정 이메일
create or replace function public.mall_builder_order_events_enqueue()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  o record;
  ns record;
  v_sms boolean;
  v_mail boolean;
  v_name text;
  v_head text;
  v_total text;
  v_bank text;
  v_phone text;
  v_email text;
  v_kind text;
  v_to_staff boolean;
  v_subject text;
  v_body text;
  v_card_paid boolean;
begin
  if new.from_status is not distinct from new.to_status then return new; end if;
  select * into o from public.mall_builder_orders where id = new.order_id;
  if o.id is null then return new; end if;
  select * into ns from public.mall_builder_store_notify_settings s where s.store_id = o.store_id;
  if ns.store_id is null then return new; end if;
  if not exists (select 1 from public.mall_builder_store_schedulers s where s.store_id = o.store_id and s.job_id is not null and not s.paused) then return new; end if;
  select coalesce(array_length(ns.kinds, 1), 0) > 0 and x.solapi_api_key <> '' and x.solapi_api_secret <> '',
         coalesce(array_length(ns.email_kinds, 1), 0) > 0 and x.resend_api_key <> '' and ns.email_from <> ''
    into v_sms, v_mail
    from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  if not coalesce(v_sms, false) and not coalesce(v_mail, false) then return new; end if;

  select st.name into v_name from public.mall_builder_stores st where st.id = o.store_id;
  v_head := '[' || coalesce(v_name, '쇼핑몰') || '] ';
  v_total := to_char(o.total, 'FM999,999,999,990') || '원';
  v_phone := public.mall_builder_digits(o.receiver ->> 'phone');
  if o.is_guest then
    v_email := o.guest_email;
  else
    select lower(u.email) into v_email from auth.users u where u.id = o.user_id;
  end if;
  v_card_paid := o.is_card and new.from_status = 'pending_payment' and new.to_status = 'paid';

  foreach v_kind in array array['staff_new_order','customer_received','customer_paid','customer_shipped','customer_expired'] loop
    v_body := null;
    v_to_staff := v_kind = 'staff_new_order';
    if v_kind = 'staff_new_order' and ((new.from_status is null and not o.is_card) or v_card_paid) then
      v_subject := '새 주문 ' || o.order_no || ' · ' || v_total;
      v_body := v_head || '새 주문 ' || o.order_no || ' · ' || v_total || ' · ' ||
                case when o.is_card then '카드 결제 완료' when o.is_credit then '외상(결제 완료)' else '무통장(입금 대기)' end ||
                case when o.is_card then '' else ' · 입금자 ' || coalesce(o.depositor, '') end ||
                case when o.is_guest then ' · 비회원' else '' end;
    elsif v_kind = 'customer_received' and new.from_status is null and new.to_status = 'pending_payment' and not o.is_card then
      v_bank := case when coalesce(o.bank ->> 'bank_account', '') <> ''
        then '계좌 ' || coalesce(o.bank ->> 'bank_name', '') || ' ' || (o.bank ->> 'bank_account') || ' (' || coalesce(o.bank ->> 'bank_holder', '') || ')'
        else '입금 계좌는 주문 상세 화면에서 확인해 주세요' end;
      v_subject := '주문 ' || o.order_no || ' 접수 — 입금 안내';
      v_body := v_head || '주문 ' || o.order_no || '이 접수되었습니다. 입금 금액 ' || v_total || ', ' || v_bank || '.' ||
                case when o.pay_deadline_at is not null
                  then ' 입금 기한 ' || to_char(o.pay_deadline_at at time zone 'Asia/Seoul', 'MM/DD HH24:MI') || ', 지나면 주문이 자동 취소됩니다.'
                  else '' end;
    elsif v_kind = 'customer_paid' and new.from_status = 'pending_payment' and new.to_status = 'paid' then
      v_subject := '주문 ' || o.order_no || case when o.is_card then ' 결제 완료' else ' 입금 확인' end;
      v_body := v_head || '주문 ' || o.order_no ||
                case when o.is_card then ' 카드 결제(' || v_total || ')가 완료되었습니다. 배송을 준비하겠습니다.'
                     else ' 입금(' || v_total || ')이 확인되었습니다. 배송을 준비하겠습니다.' end;
    elsif v_kind = 'customer_shipped' and new.to_status = 'shipping' then
      v_subject := '주문 ' || o.order_no || ' 발송 안내';
      v_body := v_head || '주문 ' || o.order_no || ' 상품을 보냈습니다. ' ||
                coalesce(nullif(o.courier, ''), '택배') || ' 송장 ' || coalesce(nullif(o.tracking_no, ''), '-');
    elsif v_kind = 'customer_expired' and new.to_status = 'cancelled' and new.from_status = 'pending_payment' and new.actor_role = 'system' and not o.is_card then
      v_subject := '주문 ' || o.order_no || ' 자동 취소 안내';
      v_body := v_head || '주문 ' || o.order_no || '이 입금 기한이 지나 자동으로 취소되었습니다. 다시 주문해 주시면 감사하겠습니다.';
    end if;
    continue when v_body is null;

    if coalesce(v_sms, false) and v_kind = any(ns.kinds) then
      if (v_to_staff and ns.staff_phone <> '') or (not v_to_staff and v_phone <> '') then
        insert into public.mall_builder_notifications (store_id, order_id, kind, channel, to_phone, body)
        values (o.store_id, o.id, v_kind, 'sms', case when v_to_staff then ns.staff_phone else v_phone end, v_body)
        on conflict do nothing;
      end if;
    end if;
    if coalesce(v_mail, false) and v_kind = any(ns.email_kinds) then
      if (v_to_staff and ns.staff_email <> '') or (not v_to_staff and coalesce(v_email, '') <> '') then
        insert into public.mall_builder_notifications (store_id, order_id, kind, channel, to_phone, to_email, subject, body)
        values (o.store_id, o.id, 'email_' || v_kind, 'email', '', case when v_to_staff then ns.staff_email else v_email end, v_head || v_subject, v_body)
        on conflict do nothing;
      end if;
    end if;
  end loop;
  return new;
end;
$$;

-- 통계(0034 + 비회원): 구매 손님 수에 비회원(휴대폰 기준) 포함
create or replace function public.mall_builder_stats(p_store_id uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰의 통계를 볼 권한이 없습니다.'; end if;
  if p_from is null or p_to is null or p_to <= p_from then raise exception '기간이 올바르지 않습니다.'; end if;
  if p_to - p_from > interval '400 days' then raise exception '기간은 400일까지 볼 수 있습니다.'; end if;

  with o as (
    select * from public.mall_builder_orders
     where store_id = p_store_id and created_at >= p_from and created_at < p_to
  ), sold as (
    select * from o where status in ('paid', 'preparing', 'shipping', 'delivered', 'confirmed', 'cancel_requested', 'return_requested')
  )
  select jsonb_build_object(
    'summary', (select jsonb_build_object(
        'orders', (select count(*) from sold),
        'sales', (select coalesce(sum(total), 0) from sold),
        'avg_order', (select coalesce(round(avg(total)), 0) from sold),
        'cancelled_count', (select count(*) from o where status in ('cancelled', 'returned')),
        'cancelled_amount', (select coalesce(sum(total), 0) from o where status in ('cancelled', 'returned')),
        'pending_count', (select count(*) from o where status = 'pending_payment'),
        'all_orders', (select count(*) from o),
        'new_customers', (select count(*) from public.mall_builder_store_customers c where c.store_id = p_store_id and c.created_at >= p_from and c.created_at < p_to),
        'total_customers', (select count(*) from public.mall_builder_store_customers c where c.store_id = p_store_id),
        'buyers', (select count(distinct coalesce(user_id::text, 'guest:' || guest_phone)) from sold),
        'guest_orders', (select count(*) from sold where is_guest)
      )),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'orders', d.orders, 'sales', d.sales) order by d.day)
        from (select (created_at at time zone 'Asia/Seoul')::date as day, count(*) as orders, sum(total) as sales from sold group by 1) d
    ), '[]'::jsonb),
    'by_status', coalesce((
      select jsonb_agg(jsonb_build_object('status', s.status, 'count', s.count) order by s.count desc)
        from (select status, count(*) as count from o group by 1) s
    ), '[]'::jsonb),
    'pay_method', coalesce((
      select jsonb_agg(jsonb_build_object('method', m.method, 'count', m.count, 'amount', m.amount) order by m.amount desc)
        from (select case when is_card then 'card' when is_credit then 'credit' else 'bank' end as method, count(*) as count, sum(total) as amount from sold group by 1) m
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object('product_id', t.product_id, 'name', t.name, 'qty', t.qty, 'amount', t.amount) order by t.amount desc)
        from (
          select i.product_id, max(i.name_snapshot) as name, sum(i.qty - i.cancelled_qty) as qty, sum(i.unit_price * (i.qty - i.cancelled_qty)) as amount
            from public.mall_builder_order_items i join sold on sold.id = i.order_id
           where i.qty > i.cancelled_qty
           group by i.product_id
           order by amount desc limit 10
        ) t
    ), '[]'::jsonb),
    'cart_top', coalesce((
      select jsonb_agg(jsonb_build_object('product_id', c.product_id, 'name', c.name, 'qty', c.qty, 'users', c.users) order by c.users desc, c.qty desc)
        from (
          select ci.product_id, max(p.name) as name, sum(ci.qty) as qty, count(distinct ci.user_id) as users
            from public.mall_builder_cart_items ci join public.mall_builder_products p on p.id = ci.product_id
           where ci.store_id = p_store_id
           group by ci.product_id
           order by users desc, qty desc limit 10
        ) c
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
