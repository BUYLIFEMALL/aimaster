-- Lab 0102 적용(한 트랜잭션) — 대상: Lab(AIMaster_dev, ref rjjtjakljjxsgjelqgek) SQL 편집기. 운영(esgxyik…)에서 실행 금지.
-- 원문: mall-builder/supabase/migrations/0102_exchanges.sql (LF sha256 14780f43e6c5daf5bf9ce14736e1c757596828c2c0a522fc9b39355adb8a33e1) — 아래 「원문 시작/끝」 사이는 한 글자도 바꾸지 않음.
begin;
do $pre$ begin
  if to_regclass('public.mall_builder_exchanges') is not null then raise exception '[멈춤] 교환 표가 이미 있습니다(0102 적용됨).'; end if;
  if exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') then raise exception '[멈춤] 0102 적용 기록이 이미 있습니다.'; end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0101_messaging') then raise exception '[멈춤] 0101 적용 기록이 없습니다(Lab이 맞는지 확인).'; end if;
  if not exists (select 1 from public.mall_builder_stores where slug = 'aimaster-b2b') then raise exception '[멈춤] 몰 aimaster-b2b가 없습니다(Lab이 맞는지 확인).'; end if;
end $pre$;
-- ── 원문 시작 ──
-- 0102 교환 흐름(M2-12b b1·b2) — PLAN_20261116_M2_12_MESSAGING_EXCHANGE.md
-- 주인님 결정(2026-11-16): D4 교환 접수 = 배송 완료 뒤 7일(유저), D5 교환비 = 개인결제창(토스, 다음 단위 b3)+무통장, 결제 확인 전에는 재발송 없음.
-- 설계: 주문 상태(delivered)는 그대로 두고 「주문 상품 1줄 + 바꿀 옵션 + 수량」 단위의 교환 표를 따로 둔다(취소·반품·정산 흐름을 건드리지 않음).
-- 재고: 상품 stock_mode = 'product'일 때만. 회수 완료 때 원래 옵션 +수량, 재발송 때 새 옵션 −수량(부족하면 막음).
-- 이번 단위에 없는 것: 토스 결제 링크(b3), 공급사 화면 재발송(b4), 교환 알림 문자·메일(다음 묶음).

create table if not exists public.mall_builder_exchanges (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  order_id uuid not null references public.mall_builder_orders (id) on delete cascade,
  item_id uuid not null references public.mall_builder_order_items (id) on delete cascade,
  qty integer not null check (qty between 1 and 999),
  from_variant_id uuid references public.mall_builder_product_variants (id) on delete set null,
  to_variant_id uuid references public.mall_builder_product_variants (id) on delete set null,
  from_option text not null default '' check (char_length(from_option) <= 200),
  to_option text not null default '' check (char_length(to_option) <= 200),
  reason text not null check (reason in ('size', 'change_mind', 'defect', 'wrong_item', 'other')),
  memo text not null default '' check (char_length(memo) <= 300),
  requested_by text not null check (requested_by in ('customer', 'staff')),
  step text not null default 'requested' check (step in ('requested', 'collecting', 'collected', 'reshipped', 'done', 'rejected')),
  collect_courier text not null default '' check (char_length(collect_courier) <= 30),
  collect_tracking text not null default '' check (char_length(collect_tracking) <= 40),
  reship_courier text not null default '' check (char_length(reship_courier) <= 30),
  reship_tracking text not null default '' check (char_length(reship_tracking) <= 40),
  fee bigint not null default 0 check (fee between 0 and 10000000),
  fee_status text not null default 'none' check (fee_status in ('none', 'waiting', 'paid')),
  fee_paid_at timestamptz,
  -- 접수 때 기록하는 옵션 분류(QA-20261117-004 P2): 원래 주문 줄 증거(옵션 번호·옵션 글자)와 바꿀 옵션 선택 — 지금 옵션이 남아 있는지에 기대지 않음
  from_option_based boolean not null default false,
  to_option_based boolean not null default false,
  -- 실제로 재고가 바뀌었을 때만 true(재고 관리 안 하는 상품·옵션 삭제·옵션 분류 바뀜으로 건너뛰면 false, 이유는 주문 이력에). 두 번 처리 방지는 단계 검사가 맡음
  restocked boolean not null default false,
  reship_deducted boolean not null default false,
  reject_note text not null default '' check (char_length(reject_note) <= 300),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_exchanges_store on public.mall_builder_exchanges (store_id, created_at desc);
create index if not exists mall_builder_exchanges_order on public.mall_builder_exchanges (order_id);
-- 한 상품 줄에 진행 중인 교환은 하나만
create unique index if not exists mall_builder_exchanges_open_item on public.mall_builder_exchanges (item_id)
  where step in ('requested', 'collecting', 'collected', 'reshipped');

alter table public.mall_builder_exchanges enable row level security;
drop policy if exists mall_builder_exchanges_read on public.mall_builder_exchanges;
create policy mall_builder_exchanges_read on public.mall_builder_exchanges for select to authenticated
  using (
    public.mall_builder_staff_can(store_id, 'orders')
    or exists (select 1 from public.mall_builder_orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );
-- 쓰기는 아래 함수로만(직접 insert·update·delete 정책 없음)
revoke insert, update, delete on public.mall_builder_exchanges from anon, authenticated;

-- 배송 완료로 바뀐 마지막 시각(주문 이력 기준 — 주문 표에 배송 완료 시각 칸이 없음)
-- 실제 상태 전이(다른 상태 → delivered)만 센다. 교환·반품 회수 기록은 delivered → delivered로 남으므로 기준 시각을 바꾸지 못한다(QA-20261117-004 P1-1)
create or replace function mall_builder_private.delivered_at(p_order_id uuid)
returns timestamptz language sql stable set search_path = '' as $$
  select max(e.created_at) from public.mall_builder_order_events e
   where e.order_id = p_order_id and e.to_status = 'delivered' and e.from_status is distinct from 'delivered'
$$;
revoke all on function mall_builder_private.delivered_at(uuid) from public;

-- 옵션 이름(옵션 key) — 없으면 빈 글자
create or replace function mall_builder_private.variant_label(p_variant_id uuid)
returns text language sql stable set search_path = '' as $$
  select coalesce((select v.key from public.mall_builder_product_variants v where v.id = p_variant_id), '')
$$;
revoke all on function mall_builder_private.variant_label(uuid) from public;

-- 교환 기록을 주문 이력에도 남김(주문 상태는 그대로)
create or replace function mall_builder_private.exchange_event(p_order_id uuid, p_role text, p_note text)
returns void language sql set search_path = '' as $$
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  select o.id, o.status, o.status, auth.uid(), p_role, left(p_note, 500) from public.mall_builder_orders o where o.id = p_order_id
$$;
revoke all on function mall_builder_private.exchange_event(uuid, text, text) from public;

-- ── 교환 접수: 유저(본인 주문·배송 완료 뒤 7일) 또는 「주문」 권한 직원(대리 접수, 기간 제한 없음) ──
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

  if o.status <> 'delivered' then raise exception '배송 완료된 주문만 교환을 접수할 수 있습니다.'; end if;
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

-- 재고 증감(상품 stock_mode = 'product'일 때만). p_delta > 0 되돌림, < 0 차감(부족하면 오류). 실제로 바꿨으면 true
-- p_variant_id가 null이면 본체 재고 — 호출하는 쪽이 「옵션 없던 상품이고 지금도 옵션 없음」일 때만 null로 부른다(본체로 대신 처리 금지)
create or replace function mall_builder_private.exchange_stock(p_product_id uuid, p_variant_id uuid, p_delta integer, p_label text)
returns boolean language plpgsql set search_path = '' as $$
declare v_mode text; v_left integer;
begin
  select p.stock_mode into v_mode from public.mall_builder_products p where p.id = p_product_id for update;
  if v_mode is distinct from 'product' then return false; end if;
  if p_variant_id is not null then
    update public.mall_builder_product_variants v set stock = v.stock + p_delta where v.id = p_variant_id and v.stock + p_delta >= 0 returning v.stock into v_left;
  else
    update public.mall_builder_products p set stock = p.stock + p_delta where p.id = p_product_id and p.stock + p_delta >= 0 returning p.stock into v_left;
  end if;
  if v_left is null and p_delta < 0 then raise exception '「%」 재고가 부족해 재발송할 수 없습니다.', p_label; end if;
  return v_left is not null;
end;
$$;
revoke all on function mall_builder_private.exchange_stock(uuid, uuid, integer, text) from public;

-- 운영사 교환 함수 공통: 권한 확인 → 잠금 순서 「주문 → 교환」 고정(교환 접수·반품·취소와 같은 주문 잠금으로 줄 세움, QA-20261117-004 P1-2)
create or replace function mall_builder_private.lock_exchange(p_exchange_id uuid)
returns public.mall_builder_exchanges language plpgsql set search_path = '' as $$
declare v_order uuid; v_store uuid; x public.mall_builder_exchanges%rowtype;
begin
  select e.order_id, e.store_id into v_order, v_store from public.mall_builder_exchanges e where e.id = p_exchange_id;
  if v_order is null or not public.mall_builder_staff_can(v_store, 'orders') then raise exception '이 교환을 바꿀 권한이 없습니다.'; end if;
  perform 1 from public.mall_builder_orders o where o.id = v_order for update;
  select * into x from public.mall_builder_exchanges e where e.id = p_exchange_id for update;
  -- 잠근 뒤 다시 확인(그사이 지워졌거나 연결이 다르면 멈춤)
  if not found or x.order_id <> v_order or not public.mall_builder_staff_can(x.store_id, 'orders') then
    raise exception '이 교환을 바꿀 권한이 없습니다.';
  end if;
  return x;
end;
$$;
revoke all on function mall_builder_private.lock_exchange(uuid) from public;

-- 교환을 진행(회수·입고·재발송·완료·교환비)하려면 주문이 지금 배송 완료 상태여야 한다
create or replace function mall_builder_private.exchange_order_delivered(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare v_status text;
begin
  select o.status into v_status from public.mall_builder_orders o where o.id = p_order_id;
  if v_status is distinct from 'delivered' then
    raise exception '주문이 배송 완료 상태가 아니라(지금 %) 교환을 진행할 수 없습니다.', coalesce(v_status, '없음');
  end if;
end;
$$;
revoke all on function mall_builder_private.exchange_order_delivered(uuid) from public;

-- 반품·취소·상태 변경과 상호 배제: 진행 중 교환이 있는 주문은 배송 완료에서 다른 상태로 못 바꾼다(모든 경로 — 반품 요청·운영사 상태 변경·취소)
create or replace function mall_builder_private.orders_exchange_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'delivered' and new.status is distinct from 'delivered' and exists (
    select 1 from public.mall_builder_exchanges x where x.order_id = new.id and x.step in ('requested', 'collecting', 'collected', 'reshipped')
  ) then
    raise exception '교환이 진행 중인 주문입니다. 교환을 끝내거나 거절한 뒤 반품·취소해 주세요.';
  end if;
  return new;
end;
$$;
revoke all on function mall_builder_private.orders_exchange_guard() from public;
drop trigger if exists mall_builder_orders_exchange_guard on public.mall_builder_orders;
create trigger mall_builder_orders_exchange_guard before update of status on public.mall_builder_orders
  for each row execute function mall_builder_private.orders_exchange_guard();

-- ── 운영사: 교환 단계 바꾸기 ──
-- collecting(회수 송장) → collected(입고·원래 옵션 재고 +) → reshipped(새 송장·새 옵션 재고 −, 교환비 결제 확인 뒤) → done / rejected(회수 완료 전까지)
create or replace function public.mall_builder_exchange_step(p_exchange_id uuid, p_step text, p_courier text default '', p_tracking text default '', p_note text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare x public.mall_builder_exchanges%rowtype; i public.mall_builder_order_items%rowtype; v_note text; v_applied boolean := false; v_skip text := '';
        v_cur_opt boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  x := mall_builder_private.lock_exchange(p_exchange_id);
  if p_step <> 'rejected' then perform mall_builder_private.exchange_order_delivered(x.order_id); end if;
  select * into i from public.mall_builder_order_items where id = x.item_id;

  if p_step = 'collecting' then
    if x.step <> 'requested' then raise exception '접수된 교환만 회수를 시작할 수 있습니다.'; end if;
    if char_length(btrim(coalesce(p_courier, ''))) not between 1 and 30 or char_length(btrim(coalesce(p_tracking, ''))) not between 1 and 40 then
      raise exception '회수 택배사와 송장 번호를 넣어 주세요.';
    end if;
    update public.mall_builder_exchanges set step = 'collecting', collect_courier = btrim(p_courier), collect_tracking = btrim(p_tracking), updated_at = now() where id = x.id;
    v_note := '교환 회수 중 · ' || btrim(p_courier) || ' ' || btrim(p_tracking);
  elsif p_step = 'collected' then
    if x.step not in ('requested', 'collecting') then raise exception '회수 전 단계의 교환만 입고 처리할 수 있습니다.'; end if;
    -- 원래 옵션 재고로만 되돌림. 원래 옵션이 지워졌거나 옵션 분류가 바뀌었으면 재고를 바꾸지 않고(본체로 대신 처리 금지) 입고는 진행
    v_cur_opt := exists (select 1 from public.mall_builder_product_variants v where v.product_id = i.product_id);
    if x.from_option_based then
      if x.from_variant_id is null then v_skip := '원래 옵션이 삭제되어 재고는 되돌리지 않음';
      else v_applied := mall_builder_private.exchange_stock(i.product_id, x.from_variant_id, x.qty, i.name_snapshot); end if;
    elsif v_cur_opt then v_skip := '옵션 없던 상품에 옵션이 생겨 재고는 되돌리지 않음';
    else v_applied := mall_builder_private.exchange_stock(i.product_id, null, x.qty, i.name_snapshot);
    end if;
    update public.mall_builder_exchanges set step = 'collected', restocked = v_applied, updated_at = now() where id = x.id;
    v_note := '교환 회수 완료(입고) · ' || i.name_snapshot || ' ' || x.qty || '개' || case when v_skip <> '' then ' · ' || v_skip else '' end;
  elsif p_step = 'reshipped' then
    if x.step <> 'collected' then raise exception '회수 완료된 교환만 재발송할 수 있습니다.'; end if;
    if x.fee > 0 and x.fee_status <> 'paid' then raise exception '교환비(%원) 결제가 확인되지 않아 재발송할 수 없습니다.', x.fee; end if;
    if char_length(btrim(coalesce(p_courier, ''))) not between 1 and 30 or char_length(btrim(coalesce(p_tracking, ''))) not between 1 and 40 then
      raise exception '재발송 택배사와 송장 번호를 넣어 주세요.';
    end if;
    -- 바꿀 옵션 재고에서만 뺀다. 옵션 상품인데 바꿀 옵션이 지워졌으면 무엇을 보낼지 몰라 막음(QA-20261117-004).
    -- 옵션 없던 상품에 옵션이 생겼으면 실물 재고가 어느 옵션 칸인지 알 수 없다 → 재발송 거절(재고 0, 단계 collected 유지). 주문은 옵션 재고로만 판매를 막으므로 건너뛰고 보내면 과판매 우회(QA-20261117-004)
    v_cur_opt := exists (select 1 from public.mall_builder_product_variants v where v.product_id = i.product_id);
    if x.to_option_based then
      if x.to_variant_id is null then raise exception '바꿀 옵션이 삭제되어 재발송할 수 없습니다. 상품 옵션이 변경되어 처리할 수 없으니 쇼핑몰 관리자에게 문의해 주세요.'; end if;
      v_applied := mall_builder_private.exchange_stock(i.product_id, x.to_variant_id, -x.qty, i.name_snapshot || coalesce(' ' || nullif(x.to_option, ''), ''));
    elsif v_cur_opt then raise exception '상품에 옵션이 새로 생겨 재발송할 수 없습니다. 상품 옵션이 변경되어 처리할 수 없으니 쇼핑몰 관리자에게 문의해 주세요.';
    else v_applied := mall_builder_private.exchange_stock(i.product_id, null, -x.qty, i.name_snapshot);
    end if;
    update public.mall_builder_exchanges set step = 'reshipped', reship_deducted = v_applied, reship_courier = btrim(p_courier), reship_tracking = btrim(p_tracking), updated_at = now() where id = x.id;
    v_note := '교환 재발송 · ' || btrim(p_courier) || ' ' || btrim(p_tracking) || case when v_skip <> '' then ' · ' || v_skip else '' end;
  elsif p_step = 'done' then
    if x.step <> 'reshipped' then raise exception '재발송한 교환만 완료할 수 있습니다.'; end if;
    update public.mall_builder_exchanges set step = 'done', updated_at = now() where id = x.id;
    v_note := '교환 완료';
  elsif p_step = 'rejected' then
    if x.step not in ('requested', 'collecting') then raise exception '회수 완료 전의 교환만 거절할 수 있습니다.'; end if;
    if char_length(btrim(coalesce(p_note, ''))) not between 1 and 300 then raise exception '거절 사유를 적어 주세요.'; end if;
    update public.mall_builder_exchanges set step = 'rejected', reject_note = btrim(p_note), updated_at = now() where id = x.id;
    v_note := '교환 거절 · ' || btrim(p_note);
  else
    raise exception '교환 단계가 올바르지 않습니다.';
  end if;
  perform mall_builder_private.exchange_event(x.order_id, 'staff', v_note);
  return p_step;
end;
$$;

-- ── 운영사: 교환비 금액 정하기(재발송 전) ──
create or replace function public.mall_builder_exchange_fee(p_exchange_id uuid, p_fee bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare x public.mall_builder_exchanges%rowtype;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  x := mall_builder_private.lock_exchange(p_exchange_id);
  perform mall_builder_private.exchange_order_delivered(x.order_id);
  if x.step not in ('requested', 'collecting', 'collected') then raise exception '재발송 전의 교환만 교환비를 바꿀 수 있습니다.'; end if;
  if x.fee_status = 'paid' then raise exception '이미 결제된 교환비는 바꿀 수 없습니다.'; end if;
  if p_fee is null or p_fee < 0 or p_fee > 10000000 then raise exception '교환비는 0원 이상 1,000만 원 이하로 넣어 주세요.'; end if;
  update public.mall_builder_exchanges set fee = p_fee, fee_status = case when p_fee > 0 then 'waiting' else 'none' end, updated_at = now() where id = x.id;
  perform mall_builder_private.exchange_event(x.order_id, 'staff', '교환비 ' || p_fee || '원으로 정함');
  return case when p_fee > 0 then 'waiting' else 'none' end;
end;
$$;

-- ── 운영사: 교환비 무통장 입금 확인 ──
create or replace function public.mall_builder_exchange_fee_paid(p_exchange_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare x public.mall_builder_exchanges%rowtype;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  x := mall_builder_private.lock_exchange(p_exchange_id);
  perform mall_builder_private.exchange_order_delivered(x.order_id);
  if x.fee_status <> 'waiting' then raise exception '결제를 기다리는 교환비가 없습니다.'; end if;
  update public.mall_builder_exchanges set fee_status = 'paid', fee_paid_at = now(), updated_at = now() where id = x.id;
  perform mall_builder_private.exchange_event(x.order_id, 'staff', '교환비 ' || x.fee || '원 입금 확인');
  return 'paid';
end;
$$;

revoke all on function public.mall_builder_request_exchange(uuid, integer, uuid, text, text) from public, anon;
grant execute on function public.mall_builder_request_exchange(uuid, integer, uuid, text, text) to authenticated;
revoke all on function public.mall_builder_exchange_step(uuid, text, text, text, text) from public, anon;
grant execute on function public.mall_builder_exchange_step(uuid, text, text, text, text) to authenticated;
revoke all on function public.mall_builder_exchange_fee(uuid, bigint) from public, anon;
grant execute on function public.mall_builder_exchange_fee(uuid, bigint) to authenticated;
revoke all on function public.mall_builder_exchange_fee_paid(uuid) from public, anon;
grant execute on function public.mall_builder_exchange_fee_paid(uuid) to authenticated;

-- ── 원문 끝 ──
insert into supabase_migrations.schema_migrations (version, name) values (to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), 'mall_builder_0102_exchanges');
commit;
