-- AI 쇼핑몰 빌더 F11 — 주문 상태 흐름·이력·재고 되돌림·송장
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(확인 창 방지 — revoke·drop 없음)
-- 허용 이동표는 src/lib/orders.ts TRANSITIONS와 같아야 한다(tests/orders.test.mjs + DB 시험으로 대조)

alter table public.mall_builder_orders add column if not exists courier text not null default '';
alter table public.mall_builder_orders add column if not exists tracking_no text not null default '';
-- 주문 때 재고를 실제로 줄였는지(취소·반품 때 그만큼만 되돌린다)
alter table public.mall_builder_order_items add column if not exists stock_deducted boolean not null default false;

-- 주문 품목이 들어갈 때 「재고 관리 상품이면 줄였음」으로 표시 — place_order가 같은 거래 안에서 재고를 줄인 직후 품목을 넣는다
create or replace function public.mall_builder_order_items_mark_stock()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.stock_deducted := exists (select 1 from public.mall_builder_products p where p.id = new.product_id and p.stock_mode = 'product');
  return new;
end;
$$;
create trigger mall_builder_order_items_mark_stock before insert on public.mall_builder_order_items
  for each row execute function public.mall_builder_order_items_mark_stock();

create or replace function public.mall_builder_status_label(p_status text)
returns text language sql immutable set search_path = '' as $$
  select case p_status
    when 'pending_payment' then '입금 대기' when 'paid' then '결제 완료' when 'preparing' then '배송 준비'
    when 'shipping' then '배송 중' when 'delivered' then '배송 완료' when 'confirmed' then '구매 확정'
    when 'cancel_requested' then '취소 요청' when 'cancelled' then '취소'
    when 'return_requested' then '반품 요청' when 'returned' then '반품 완료' else p_status end
$$;

create or replace function public.mall_builder_transition_allowed(p_role text, p_from text, p_to text)
returns boolean language sql immutable set search_path = '' as $$
  select exists (select 1 from (values
    ('customer', 'pending_payment', 'cancelled'),
    ('customer', 'paid', 'cancel_requested'),
    ('customer', 'preparing', 'cancel_requested'),
    ('customer', 'delivered', 'confirmed'),
    ('customer', 'delivered', 'return_requested'),
    ('staff', 'pending_payment', 'paid'),
    ('staff', 'pending_payment', 'cancelled'),
    ('staff', 'paid', 'preparing'),
    ('staff', 'paid', 'cancelled'),
    ('staff', 'preparing', 'shipping'),
    ('staff', 'preparing', 'cancelled'),
    ('staff', 'shipping', 'delivered'),
    ('staff', 'delivered', 'confirmed'),
    ('staff', 'cancel_requested', 'cancelled'),
    ('staff', 'cancel_requested', 'paid'),
    ('staff', 'return_requested', 'returned'),
    ('staff', 'return_requested', 'delivered')
  ) t(r, f, s) where t.r = p_role and t.f = p_from and t.s = p_to)
$$;

-- 주문 상태 바꾸기 — 그 몰 운영자 또는 주문한 손님만, 이동표에 있는 것만. 취소·반품 완료면 재고를 되돌린다
create or replace function public.mall_builder_change_order_status(
  p_order_id uuid,
  p_to text,
  p_note text default '',
  p_courier text default '',
  p_tracking text default ''
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order public.mall_builder_orders%rowtype;
  v_role text;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_order from public.mall_builder_orders o where o.id = p_order_id for update;
  if not found then raise exception '주문을 찾을 수 없습니다.'; end if;
  -- 운영자이면서 그 몰 손님일 수도 있다 — 본인 주문이고 손님에게 허용된 이동이면 손님으로, 아니면 운영자로 기록
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
    update public.mall_builder_product_variants v set stock = v.stock + i.qty
      from public.mall_builder_order_items i
      where i.order_id = p_order_id and i.stock_deducted and i.variant_id is not null and v.id = i.variant_id;
    update public.mall_builder_products p set stock = p.stock + i.qty
      from public.mall_builder_order_items i
      where i.order_id = p_order_id and i.stock_deducted and i.variant_id is null and p.id = i.product_id;
    update public.mall_builder_order_items i set stock_deducted = false where i.order_id = p_order_id and i.stock_deducted;
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
