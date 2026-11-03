-- AI 쇼핑몰 빌더 D5 — 부분 취소(품목 일부·수량 일부)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가·함수 정의만, 지우기 문장 없음(docs/mall/LESSONS_LEARNED.md 점검 목록).
-- 적용은 셋으로 나눔: mall_builder_0021a_cancelled_qty(칸) / mall_builder_0021b_cancel_items(부분 취소 함수) / mall_builder_0021c_status_restore_remaining(전체 취소·반품은 남은 수량만 재고 되돌림)
-- 규칙: 운영자만, 배송 전(입금 대기·결제 완료·배송 준비)만. 단가는 주문 때 그대로(구간 할인 다시 계산 안 함 — 기록에 남김).
--   남은 품목으로 상품 금액·배송비(정책 묶음·주문 때 지역)를 다시 계산해 주문 금액을 줄인다. 외상이면 장부에서 차액 되돌림, 무통장(결제 완료)이면 환불할 금액을 기록.
--   모든 수량을 취소하는 경우는 기존 「주문 취소」를 쓰게 한다(주문 상태가 끝까지 일관되게).

-- ── 0021a ──
alter table public.mall_builder_order_items add column if not exists cancelled_qty integer not null default 0;
alter table public.mall_builder_order_items add constraint mall_builder_order_items_cancelled_qty_range check (cancelled_qty >= 0 and cancelled_qty <= qty);

-- ── 0021b ──
-- p_items = [{item_id, qty}] (qty = 이번에 취소할 수량)
create or replace function public.mall_builder_cancel_order_items(p_order_id uuid, p_items jsonb, p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order public.mall_builder_orders%rowtype;
  v_it jsonb;
  v_item public.mall_builder_order_items%rowtype;
  v_qty integer;
  v_desc text := '';
  v_left integer;
  v_groups jsonb := '{}'::jsonb;
  v_key text;
  v_policy public.mall_builder_shipping_policies%rowtype;
  v_fee bigint;
  v_subtotal bigint := 0;
  v_ship bigint := 0;
  v_diff bigint;
  v_region text;
  v_balance bigint;
  r record;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_order from public.mall_builder_orders o where o.id = p_order_id for update;
  if not found or not public.mall_builder_is_store_staff(v_order.store_id) then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  if v_order.status not in ('pending_payment', 'paid', 'preparing') then raise exception '배송 전 주문만 부분 취소할 수 있습니다.'; end if;
  if char_length(coalesce(p_note, '')) > 200 then raise exception '메모는 200자 이내로 입력해 주세요.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception '취소할 품목과 수량을 골라 주세요.'; end if;

  for v_it in select * from jsonb_array_elements(p_items) loop
    if coalesce(v_it ->> 'qty', '') !~ '^[0-9]+$' then raise exception '취소 수량을 숫자로 입력해 주세요.'; end if;
    v_qty := (v_it ->> 'qty')::integer;
    continue when v_qty = 0;
    select * into v_item from public.mall_builder_order_items i where i.id = (v_it ->> 'item_id')::uuid and i.order_id = p_order_id for update;
    if not found then raise exception '주문 품목을 찾을 수 없습니다.'; end if;
    v_left := v_item.qty - v_item.cancelled_qty;
    if v_qty > v_left then raise exception '「%」은(는) %개까지 취소할 수 있습니다.', v_item.name_snapshot, v_left; end if;
    update public.mall_builder_order_items set cancelled_qty = cancelled_qty + v_qty where id = v_item.id;
    -- 재고를 뺀 품목이면 취소 수량만큼 되돌림
    if v_item.stock_deducted then
      if v_item.variant_id is not null then
        update public.mall_builder_product_variants set stock = stock + v_qty where id = v_item.variant_id;
      elsif v_item.product_id is not null then
        update public.mall_builder_products set stock = stock + v_qty where id = v_item.product_id;
      end if;
    end if;
    v_desc := v_desc || case when v_desc = '' then '' else ', ' end || v_item.name_snapshot
              || case when v_item.option_snapshot <> '' then '(' || v_item.option_snapshot || ')' else '' end || ' ' || v_qty || '개';
  end loop;
  if v_desc = '' then raise exception '취소할 수량을 1개 이상 넣어 주세요.'; end if;

  -- 남은 수량으로 다시 계산(주문 DB 함수와 같은 배송비 규칙, 지역은 주문 때 저장한 값)
  for r in select i.unit_price * (i.qty - i.cancelled_qty) as amount, i.shipping_policy_id from public.mall_builder_order_items i where i.order_id = p_order_id loop
    v_subtotal := v_subtotal + r.amount;
    continue when r.amount = 0;
    v_key := coalesce(r.shipping_policy_id::text, 'none');
    v_groups := jsonb_set(v_groups, array[v_key], to_jsonb(coalesce((v_groups ->> v_key)::bigint, 0) + r.amount));
  end loop;
  if v_subtotal = 0 and not exists (select 1 from public.mall_builder_order_items i where i.order_id = p_order_id and i.qty > i.cancelled_qty) then
    raise exception '모든 품목을 취소하려면 「주문 취소」를 써 주세요.';
  end if;
  v_region := coalesce(v_order.receiver ->> 'region', 'mainland');
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
  -- 배송비가 오히려 늘어나는 경우(조건부 무료 기준 아래로 내려감)에도 손님 부담을 늘리지 않는다: 원래 배송비가 상한
  v_ship := least(v_ship, v_order.shipping_fee);
  v_diff := v_order.total - (v_subtotal + v_ship);

  update public.mall_builder_orders set subtotal = v_subtotal, shipping_fee = v_ship, total = v_subtotal + v_ship, updated_at = now() where id = p_order_id;

  if v_diff > 0 and v_order.is_credit and v_order.customer_id is not null then
    perform 1 from public.mall_builder_store_customers c where c.id = v_order.customer_id for update;
    select coalesce(sum(l.amount), 0) into v_balance from public.mall_builder_credit_ledger l where l.customer_id = v_order.customer_id;
    insert into public.mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note, actor_id)
    values (v_order.store_id, v_order.customer_id, p_order_id, 'adjust', -v_diff, v_balance - v_diff, '주문 ' || v_order.order_no || ' 부분 취소 — 외상 되돌림', v_uid);
  end if;

  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (p_order_id, v_order.status, v_order.status, v_uid, 'staff',
          '부분 취소: ' || v_desc || ' · 결제 금액 ' || to_char(v_order.total, 'FM999,999,999,999') || '원 → ' || to_char(v_subtotal + v_ship, 'FM999,999,999,999') || '원'
          || case when v_diff > 0 and v_order.is_credit then ' (외상 되돌림)'
                  when v_diff > 0 and v_order.status <> 'pending_payment' then ' (환불할 금액 ' || to_char(v_diff, 'FM999,999,999,999') || '원)'
                  else '' end
          || case when coalesce(btrim(p_note), '') <> '' then ' — ' || btrim(p_note) else '' end);
  return jsonb_build_object('total', v_subtotal + v_ship, 'refund', v_diff);
end;
$$;

-- ── 0021c ── 전체 취소·반품: 부분 취소된 수량은 이미 되돌렸으므로 남은 수량만 재고 되돌림(나머지는 0014와 같음)
create or replace function public.mall_builder_change_order_status(p_order_id uuid, p_to text, p_note text default '', p_courier text default '', p_tracking text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order public.mall_builder_orders%rowtype;
  v_role text;
  v_balance bigint;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_order from public.mall_builder_orders o where o.id = p_order_id for update;
  if not found then raise exception '주문을 찾을 수 없습니다.'; end if;
  if v_order.user_id = v_uid and public.mall_builder_transition_allowed('customer', v_order.status, p_to) then
    v_role := 'customer';
  elsif public.mall_builder_is_store_staff(v_order.store_id) and public.mall_builder_transition_allowed('staff', v_order.status, p_to) then
    v_role := 'staff';
  elsif not public.mall_builder_is_store_staff(v_order.store_id) and v_order.user_id <> v_uid then
    raise exception '이 주문을 바꿀 권한이 없습니다.';
  else
    raise exception '「%」 상태에서 「%」(으)로 바꿀 수 없습니다.', public.mall_builder_status_label(v_order.status), public.mall_builder_status_label(p_to);
  end if;
  if char_length(coalesce(p_note, '')) > 200 then raise exception '메모는 200자 이내로 입력해 주세요.'; end if;
  if p_to = 'shipping' and (char_length(btrim(coalesce(p_courier, ''))) not between 1 and 30 or char_length(btrim(coalesce(p_tracking, ''))) not between 1 and 40) then
    raise exception '택배사와 송장 번호를 입력해 주세요.';
  end if;

  if p_to in ('cancelled', 'returned') then
    update public.mall_builder_product_variants v set stock = v.stock + (i.qty - i.cancelled_qty)
      from public.mall_builder_order_items i
      where i.order_id = p_order_id and i.stock_deducted and i.variant_id is not null and v.id = i.variant_id;
    update public.mall_builder_products p set stock = p.stock + (i.qty - i.cancelled_qty)
      from public.mall_builder_order_items i
      where i.order_id = p_order_id and i.stock_deducted and i.variant_id is null and p.id = i.product_id;
    update public.mall_builder_order_items i set stock_deducted = false where i.order_id = p_order_id and i.stock_deducted;
    if v_order.is_credit and v_order.customer_id is not null then
      perform 1 from public.mall_builder_store_customers c where c.id = v_order.customer_id for update;
      select coalesce(sum(l.amount), 0) into v_balance from public.mall_builder_credit_ledger l where l.customer_id = v_order.customer_id;
      insert into public.mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note, actor_id)
      values (v_order.store_id, v_order.customer_id, p_order_id, 'adjust', -v_order.total, v_balance - v_order.total,
              '주문 ' || v_order.order_no || ' ' || public.mall_builder_status_label(p_to) || ' — 외상 되돌림', v_uid);
    end if;
  end if;

  update public.mall_builder_orders o set
    status = p_to,
    courier = case when p_to = 'shipping' then btrim(p_courier) else o.courier end,
    tracking_no = case when p_to = 'shipping' then btrim(p_tracking) else o.tracking_no end,
    updated_at = now()
  where o.id = p_order_id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (p_order_id, v_order.status, p_to, v_uid, v_role, coalesce(btrim(p_note), ''));
  return p_to;
end;
$$;
