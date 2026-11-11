-- AI 쇼핑몰 빌더 D36 — 입점형 마켓플레이스 3단계: 주문 분배·공급사 발송
-- 플랜 docs/PLAN_20261111_MARKETPLACE.md. AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만. 추가만(drop 없음).
-- 주문 경로(일반·비회원·견적·정기)를 하나하나 고치지 않고 주문 품목 트리거 하나로:
--   공급사 상품이 승인 상태가 아니거나 공급사가 쉬는 중이면 주문을 막고, 품목별 공급사·공급가를 손님이 못 읽는 별도 표에 남긴다.
-- 공급사는 자기 품목만 보고(받는 사람은 결제 완료~배송 중일 때만) 품목별 송장을 넣는다. 남은 품목이 모두 공급사 품목이고 모두 발송되면 주문을 「배송 중」으로.

create table if not exists public.mall_builder_order_item_supply (
  order_item_id uuid primary key references public.mall_builder_order_items (id) on delete cascade,
  order_id uuid not null references public.mall_builder_orders (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  supplier_id uuid not null references public.mall_builder_suppliers (id),
  supply_price bigint not null check (supply_price >= 0),
  courier text not null default '' check (char_length(courier) <= 30),
  tracking_no text not null default '' check (char_length(tracking_no) <= 40),
  shipped_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_order_item_supply_supplier on public.mall_builder_order_item_supply (supplier_id, created_at desc);
create index if not exists mall_builder_order_item_supply_order on public.mall_builder_order_item_supply (order_id);
alter table public.mall_builder_order_item_supply enable row level security;
-- 읽기: 주문 권한 운영자, 공급사 본인. 쓰기 규칙 없음(트리거·함수로만)
create policy mall_builder_order_item_supply_read on public.mall_builder_order_item_supply for select
  using (public.mall_builder_staff_can(store_id, 'orders')
         or exists (select 1 from public.mall_builder_suppliers x where x.id = mall_builder_order_item_supply.supplier_id and x.user_id = (select auth.uid())));

-- 주문 품목이 생길 때: 공급사 상품 판매 가능 여부 검사 + 공급사·공급가 기록
create or replace function public.mall_builder_order_items_supplier()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_sid uuid; v_approval text; v_name text; v_store uuid; v_sup_status text; v_supply bigint;
begin
  select p.supplier_id, p.approval, p.name, p.store_id into v_sid, v_approval, v_name, v_store from public.mall_builder_products p where p.id = new.product_id;
  if v_sid is null then return new; end if;
  select x.status into v_sup_status from public.mall_builder_suppliers x where x.id = v_sid;
  if v_approval <> 'approved' or coalesce(v_sup_status, '') <> 'active' then
    raise exception '「%」은(는) 지금 판매하지 않는 상품입니다. 장바구니에서 빼 주세요.', v_name;
  end if;
  select s.supply_price into v_supply from public.mall_builder_product_supply s where s.product_id = new.product_id;
  insert into public.mall_builder_order_item_supply (order_item_id, order_id, store_id, supplier_id, supply_price)
  values (new.id, new.order_id, v_store, v_sid, coalesce(v_supply, 0));
  return new;
end;
$$;
create trigger mall_builder_order_items_supplier after insert on public.mall_builder_order_items
  for each row execute function public.mall_builder_order_items_supplier();

-- 공급사: 내 주문 품목(최근 300개). 받는 사람·요청사항은 결제 완료·준비 중·배송 중이고 남은 수량이 있을 때만
create or replace function public.mall_builder_supplier_orders(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_sid uuid;
begin
  select x.id into v_sid from public.mall_builder_suppliers x
   where x.store_id = p_store_id and x.user_id = auth.uid() and x.status in ('active', 'paused');
  if auth.uid() is null or v_sid is null then raise exception '이 몰의 공급사 계정이 아닙니다.'; end if;
  return coalesce((
    select jsonb_agg(r order by r ->> 'ordered_at' desc) from (
      select jsonb_build_object(
        'item_id', i.id, 'order_no', o.order_no, 'ordered_at', o.created_at, 'order_status', o.status,
        'name', i.name_snapshot, 'option', i.option_snapshot, 'qty', i.qty, 'cancelled_qty', i.cancelled_qty,
        'supply_price', s.supply_price, 'courier', s.courier, 'tracking_no', s.tracking_no, 'shipped_at', s.shipped_at,
        'receiver', case when o.status in ('paid', 'preparing', 'shipping') and i.qty > i.cancelled_qty
                         then jsonb_build_object('receiver', o.receiver ->> 'receiver', 'phone', o.receiver ->> 'phone', 'zip', o.receiver ->> 'zip',
                                                 'addr1', o.receiver ->> 'addr1', 'addr2', o.receiver ->> 'addr2', 'memo', o.memo)
                         else null end
      ) r
      from public.mall_builder_order_item_supply s
      join public.mall_builder_order_items i on i.id = s.order_item_id
      join public.mall_builder_orders o on o.id = s.order_id
      where s.supplier_id = v_sid and o.status <> 'pending_payment'
      order by o.created_at desc
      limit 300
    ) q(r)
  ), '[]'::jsonb);
end;
$$;

-- 공급사: 품목 송장 넣기(고치기 가능, 배송 완료 전까지). 남은 품목이 모두 공급사 품목이고 모두 발송되면 주문을 「배송 중」으로
create or replace function public.mall_builder_supplier_ship(p_item_id uuid, p_courier text, p_tracking text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  s public.mall_builder_order_item_supply%rowtype;
  o public.mall_builder_orders%rowtype;
  v_courier text := btrim(coalesce(p_courier, ''));
  v_tracking text := btrim(coalesce(p_tracking, ''));
  v_left int; v_couriers int;
begin
  select * into s from public.mall_builder_order_item_supply x where x.order_item_id = p_item_id for update;
  if s.order_item_id is null or auth.uid() is null
     or not exists (select 1 from public.mall_builder_suppliers x where x.id = s.supplier_id and x.user_id = auth.uid() and x.status in ('active', 'paused')) then
    raise exception '내 주문 품목을 찾을 수 없습니다.';
  end if;
  if char_length(v_courier) not between 1 and 30 or char_length(v_tracking) not between 1 and 40 then raise exception '택배사와 송장 번호를 입력해 주세요.'; end if;
  select * into o from public.mall_builder_orders x where x.id = s.order_id for update;
  if o.status not in ('paid', 'preparing', 'shipping') then raise exception '결제 완료·준비 중·배송 중인 주문만 송장을 넣을 수 있습니다.'; end if;
  if exists (select 1 from public.mall_builder_order_items i where i.id = p_item_id and i.qty <= i.cancelled_qty) then raise exception '모두 취소된 품목입니다.'; end if;
  update public.mall_builder_order_item_supply set courier = v_courier, tracking_no = v_tracking, shipped_at = coalesce(shipped_at, now()) where order_item_id = s.order_item_id;

  if o.status in ('paid', 'preparing') then
    -- 남은(취소 안 된) 품목 중 발송 안 된 것: 몰 자체 품목이거나 공급사 품목인데 송장 없음
    select count(*) into v_left from public.mall_builder_order_items i
      left join public.mall_builder_order_item_supply x on x.order_item_id = i.id
     where i.order_id = o.id and i.qty > i.cancelled_qty and (x.order_item_id is null or x.shipped_at is null);
    if v_left = 0 then
      select count(distinct (x.courier, x.tracking_no)) into v_couriers from public.mall_builder_order_item_supply x
        join public.mall_builder_order_items i on i.id = x.order_item_id where x.order_id = o.id and i.qty > i.cancelled_qty;
      update public.mall_builder_orders
         set status = 'shipping',
             courier = case when v_couriers = 1 then v_courier else '여러 곳' end,
             tracking_no = case when v_couriers = 1 then v_tracking else '품목별 송장' end,
             updated_at = now()
       where id = o.id;
      insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
      values (o.id, o.status, 'shipping', auth.uid(), 'system', '공급사 발송 완료');
      return 'shipping';
    end if;
  end if;
  return o.status;
end;
$$;

-- 손님(주문한 사람)·주문 권한 운영자: 품목별 송장(공급가 없음)
create or replace function public.mall_builder_order_item_tracking(p_order_id uuid)
returns table (order_item_id uuid, courier text, tracking_no text, shipped_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.order_item_id, s.courier, s.tracking_no, s.shipped_at
    from public.mall_builder_order_item_supply s join public.mall_builder_orders o on o.id = s.order_id
   where s.order_id = p_order_id and s.shipped_at is not null
     and (o.user_id = auth.uid() or public.mall_builder_staff_can(o.store_id, 'orders'))
$$;

-- ── 권한(별도 마이그레이션 0055_supplier_orders_grants로 적용) ──
revoke all on function public.mall_builder_supplier_orders(uuid) from public, anon;
revoke all on function public.mall_builder_supplier_ship(uuid, text, text) from public, anon;
revoke all on function public.mall_builder_order_item_tracking(uuid) from public, anon;
grant execute on function public.mall_builder_supplier_orders(uuid) to authenticated;
grant execute on function public.mall_builder_supplier_ship(uuid, text, text) to authenticated;
grant execute on function public.mall_builder_order_item_tracking(uuid) to authenticated;
revoke all on function public.mall_builder_order_items_supplier() from public, anon, authenticated;
