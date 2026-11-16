-- 0103 교환 가능 상태에 구매 확정 포함(자동 확정과 교환 7일 충돌 보완) — Master msg_bbe68e2b303d·msg_abc5861bd197, PLAN_20261116_M2_12 8절
-- 주인님 결정 D4 「실제 배송 뒤 7일」 유지. Lab/운영의 자동 구매 확정(0032 mall_builder_auto_progress, 배송 완료 N일 뒤 delivered→confirmed)이
-- 7일 안에 주문을 confirmed로 바꾸므로, 교환 가능 상태를 delivered·confirmed로 넓힌다.
-- 또 0102 지킴 트리거가 진행 중 교환 주문의 delivered→confirmed를 막아 자동 확정 한 회차 전체가 되돌려지던(P1) 것을 고친다.
-- 0102(Lab 적용본)의 본문·기록은 그대로 두고 함수만 다시 정의. 0102만 전제(0104 카드 결제 없이도 적용 가능).

-- 교환 가능 주문 상태 한 곳(교환 신청·진행 단계·교환비 결제가 같이 씀)
create or replace function mall_builder_private.exchange_order_status_ok(p_status text)
returns boolean language sql immutable set search_path = '' as $$
  select p_status in ('delivered', 'confirmed')
$$;
revoke all on function mall_builder_private.exchange_order_status_ok(text) from public;

-- 진행 단계(회수·입고·교환비·재발송·완료) 전 주문 상태 확인 — 이름은 0102 그대로(호출하는 함수들이 그대로 씀)
create or replace function mall_builder_private.exchange_order_delivered(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare v_status text;
begin
  select o.status into v_status from public.mall_builder_orders o where o.id = p_order_id;
  if not coalesce(mall_builder_private.exchange_order_status_ok(v_status), false) then
    raise exception '주문이 배송 완료(구매 확정 포함) 상태가 아니라(지금 %) 교환을 진행할 수 없습니다.', coalesce(v_status, '없음');
  end if;
end;
$$;
revoke all on function mall_builder_private.exchange_order_delivered(uuid) from public;

-- 교환 신청: 0102 정의 그대로 + 상태 검사만 교환 가능 상태로
create or replace function public.mall_builder_request_exchange(p_item_id uuid, p_qty integer, p_to_variant_id uuid, p_reason text, p_memo text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  i public.mall_builder_order_items%rowtype; o public.mall_builder_orders%rowtype;
  v_role text; v_used integer; v_from_opt boolean; v_cur_opt boolean; v_fee bigint := 0; v_id uuid; v_delivered timestamptz;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into i from public.mall_builder_order_items where id = p_item_id;
  if not found then raise exception '주문 상품을 찾을 수 없습니다.'; end if;
  select * into o from public.mall_builder_orders where id = i.order_id for update;
  if public.mall_builder_staff_can(o.store_id, 'orders') then v_role := 'staff';
  elsif o.user_id = auth.uid() then v_role := 'customer';
  else raise exception '주문 상품을 찾을 수 없습니다.'; end if;

  -- 배송 완료와 구매 확정(자동·수동) 모두 교환 가능. 유저 7일 기준은 아래 실제 배송 전이 시각 그대로(구매 확정 시각과 무관)
  if not mall_builder_private.exchange_order_status_ok(o.status) then raise exception '배송 완료(구매 확정 포함)된 주문만 교환을 접수할 수 있습니다.'; end if;
  if v_role = 'customer' then
    v_delivered := mall_builder_private.delivered_at(o.id);
    if v_delivered is null or now() > v_delivered + interval '7 days' then
      raise exception '교환은 배송 완료 뒤 7일 안에 신청할 수 있습니다. 쇼핑몰에 문의해 주세요.';
    end if;
  end if;
  if p_reason is null or p_reason not in ('size', 'change_mind', 'defect', 'wrong_item', 'other') then raise exception '교환 사유를 골라 주세요.'; end if;

  select coalesce(sum(x.qty), 0) into v_used from public.mall_builder_exchanges x where x.item_id = i.id and x.step <> 'rejected';
  if p_qty is null or p_qty < 1 or p_qty > i.qty - i.cancelled_qty - v_used then
    raise exception '교환할 수 있는 수량은 %개입니다.', greatest(i.qty - i.cancelled_qty - v_used, 0);
  end if;
  if exists (select 1 from public.mall_builder_exchanges x where x.item_id = i.id and x.step in ('requested', 'collecting', 'collected', 'reshipped')) then
    raise exception '이 상품은 이미 교환이 진행 중입니다.';
  end if;

  -- 원래 옵션 상품인지는 주문 줄 증거로(옵션이 지워져 번호가 비어도 옵션 글자가 남음). 지금 옵션 유무는 고를 옵션이 있는지만 본다
  v_from_opt := i.variant_id is not null or coalesce(i.option_snapshot, '') <> '';
  v_cur_opt := exists (select 1 from public.mall_builder_product_variants v where v.product_id = i.product_id);
  if v_from_opt then
    if not v_cur_opt then raise exception '이 상품의 옵션이 모두 없어져 바꿀 옵션을 고를 수 없습니다. 쇼핑몰에 문의해 주세요.'; end if;
    if p_to_variant_id is null or not exists (
      select 1 from public.mall_builder_product_variants v where v.id = p_to_variant_id and v.product_id = i.product_id and v.is_active
    ) then raise exception '바꿀 옵션을 골라 주세요(같은 상품의 판매 중인 옵션만).'; end if;
  elsif p_to_variant_id is not null then
    raise exception '옵션이 없던 상품은 같은 상품으로만 교환합니다.';
  end if;

  if p_reason in ('size', 'change_mind', 'other') then
    select coalesce(sp.exchange_fee, 0) into v_fee from public.mall_builder_shipping_policies sp where sp.id = i.shipping_policy_id;
    v_fee := coalesce(v_fee, 0);
  end if;

  insert into public.mall_builder_exchanges (store_id, order_id, item_id, qty, from_variant_id, to_variant_id, from_option, to_option,
         reason, memo, requested_by, fee, fee_status, created_by, from_option_based, to_option_based)
  values (o.store_id, o.id, i.id, p_qty, i.variant_id, case when v_from_opt then p_to_variant_id end,
          left(coalesce(nullif(i.option_snapshot, ''), mall_builder_private.variant_label(i.variant_id)), 200),
          left(mall_builder_private.variant_label(p_to_variant_id), 200),
          p_reason, left(btrim(coalesce(p_memo, '')), 300), v_role, v_fee, case when v_fee > 0 then 'waiting' else 'none' end, auth.uid(), v_from_opt, v_from_opt)
  returning id into v_id;
  perform mall_builder_private.exchange_event(o.id, v_role,
    '교환 접수 · ' || i.name_snapshot || ' ' || p_qty || '개' || case when v_from_opt then ' → ' || mall_builder_private.variant_label(p_to_variant_id) else '' end
    || case when v_fee > 0 then ' · 교환비 ' || v_fee || '원' else '' end);
  return v_id;
end;
$$;

revoke all on function public.mall_builder_request_exchange(uuid, integer, uuid, text, text) from public, anon;
grant execute on function public.mall_builder_request_exchange(uuid, integer, uuid, text, text) to authenticated;

-- 주문 상태 지킴: 진행 중 교환이 있으면 교환 가능 상태(delivered·confirmed) 밖으로 나가는 전이만 막는다.
-- delivered→confirmed(자동·수동 구매 확정)는 허용 — 막으면 자동 확정 한 회차 전체가 되돌려진다(P1). 반품 요청·취소 등은 그대로 막음
create or replace function mall_builder_private.orders_exchange_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if mall_builder_private.exchange_order_status_ok(old.status)
     and not coalesce(mall_builder_private.exchange_order_status_ok(new.status), false)
     and exists (select 1 from public.mall_builder_exchanges x where x.order_id = new.id and x.step in ('requested', 'collecting', 'collected', 'reshipped'))
  then
    raise exception '교환이 진행 중인 주문입니다. 교환을 끝내거나 거절한 뒤 반품·취소해 주세요.';
  end if;
  return new;
end;
$$;
revoke all on function mall_builder_private.orders_exchange_guard() from public;
