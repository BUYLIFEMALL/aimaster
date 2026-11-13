-- AI 쇼핑몰 빌더 T2-3·T2-4 — 분양몰 주문 전달·상태 연동·분양자 마진 장부·출금 (2026-11-13)
-- 설계 docs/PLAN_20261113_T2_RESALE_MALL.md §3. 돈은 본사 계좌로 들어오므로 분양몰 주문의 「입금 확인」은 본사(원본 몰 주문 권한)만,
-- 준비·발송·배송 완료는 본사 전달 주문을 따라 자동. 추가·함수 추가만(drop 없음).

alter table public.mall_builder_orders add column if not exists forwarded_order_id uuid references public.mall_builder_orders (id);
alter table public.mall_builder_orders add column if not exists resale_order_id uuid references public.mall_builder_orders (id);
create index if not exists mall_builder_orders_resale_order on public.mall_builder_orders (resale_order_id) where resale_order_id is not null;

-- ── 분양자 마진 장부·출금 ──
create table if not exists public.mall_builder_resale_ledger (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade, -- 분양몰
  order_id uuid references public.mall_builder_orders (id) on delete set null,
  payout_id uuid,
  kind text not null check (kind in ('earn', 'reclaim', 'payout', 'refund')),
  amount bigint not null,
  balance_after bigint not null,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_resale_ledger_store on public.mall_builder_resale_ledger (store_id, created_at desc);
create table if not exists public.mall_builder_resale_payouts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade, -- 분양몰
  source_store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  amount bigint not null check (amount > 0),
  bank_name text not null check (char_length(btrim(bank_name)) between 1 and 30),
  bank_account text not null check (char_length(btrim(bank_account)) between 1 and 40),
  bank_holder text not null check (char_length(btrim(bank_holder)) between 1 and 30),
  status text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  memo text not null default '' check (char_length(memo) <= 200),
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists mall_builder_resale_payouts_source on public.mall_builder_resale_payouts (source_store_id, status, requested_at desc);
alter table public.mall_builder_resale_ledger enable row level security;
alter table public.mall_builder_resale_payouts enable row level security;
-- 읽기: 분양몰 대표, 원본 몰 대표. 쓰기는 함수·트리거로만
create policy mall_builder_resale_ledger_read on public.mall_builder_resale_ledger for select
  using (public.mall_builder_staff_can(store_id, 'owner')
         or exists (select 1 from public.mall_builder_stores s where s.id = mall_builder_resale_ledger.store_id and public.mall_builder_staff_can(s.source_store_id, 'owner')));
create policy mall_builder_resale_payouts_read on public.mall_builder_resale_payouts for select
  using (public.mall_builder_staff_can(store_id, 'owner') or public.mall_builder_staff_can(source_store_id, 'owner'));

create or replace function mall_builder_private.resale_ledger_add(p_store uuid, p_order uuid, p_payout uuid, p_kind text, p_amount bigint, p_note text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_bal bigint;
begin
  perform pg_advisory_xact_lock(hashtext('mall_builder_resale_ledger:' || p_store::text));
  select coalesce(sum(l.amount), 0) into v_bal from public.mall_builder_resale_ledger l where l.store_id = p_store;
  insert into public.mall_builder_resale_ledger (store_id, order_id, payout_id, kind, amount, balance_after, note)
  values (p_store, p_order, p_payout, p_kind, p_amount, v_bal + p_amount, left(coalesce(p_note, ''), 200));
  return v_bal + p_amount;
end;
$$;

-- ── 본사 전달 주문 만들기(분양몰 주문이 「결제 완료」가 될 때) ──
create or replace function mall_builder_private.resale_forward(p_order uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  s public.mall_builder_stores%rowtype;
  v_cust uuid;
  v_seq int;
  v_new uuid;
  r record;
  v_sub bigint := 0;
  v_unit bigint;
  v_sv public.mall_builder_product_variants%rowtype;
  v_src public.mall_builder_products%rowtype;
begin
  select * into o from public.mall_builder_orders x where x.id = p_order;
  select * into s from public.mall_builder_stores x where x.id = o.store_id;
  if s.kind <> 'resale' or o.forwarded_order_id is not null then return o.forwarded_order_id; end if;
  select c.id into v_cust from public.mall_builder_store_customers c where c.store_id = s.source_store_id and c.user_id = s.owner_id;
  perform pg_advisory_xact_lock(hashtext('mall_builder_order_seq:' || s.source_store_id::text));
  select coalesce(max(x.seq), 0) + 1 into v_seq from public.mall_builder_orders x where x.store_id = s.source_store_id;
  insert into public.mall_builder_orders (store_id, seq, order_no, user_id, customer_id, status, pay_method, receiver, depositor, bank, memo, resale_order_id)
  values (s.source_store_id, v_seq, to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0'),
          s.owner_id, v_cust, 'paid', 'bank', o.receiver, left('분양 ' || s.name, 20), '{}'::jsonb,
          left('분양몰 ' || s.slug || ' 주문 ' || o.order_no || case when o.memo <> '' then ' · ' || o.memo else '' end, 200), o.id)
  returning id into v_new;
  for r in select i.*, m.source_product_id from public.mall_builder_order_items i join public.mall_builder_products m on m.id = i.product_id
            where i.order_id = o.id and i.qty > i.cancelled_qty loop
    if r.source_product_id is null then raise exception '분양 상품 「%」의 본사 상품을 찾을 수 없습니다.', r.name_snapshot; end if;
    select * into v_src from public.mall_builder_products p where p.id = r.source_product_id for update;
    v_sv := null;
    if r.variant_id is not null then
      select v.* into v_sv from public.mall_builder_product_variants v where v.product_id = v_src.id and v.key = r.option_snapshot for update;
      if v_sv.id is null then raise exception '「% %」 옵션이 본사 상품에서 사라졌습니다.', r.name_snapshot, r.option_snapshot; end if;
    end if;
    v_unit := v_src.base_price + coalesce(v_sv.extra_price, 0);
    insert into public.mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, image_url, unit_price, qty, line_total, price_breakdown, shipping_policy_id)
    values (v_new, v_src.id, v_sv.id, v_src.name, coalesce(v_sv.key, ''), v_src.images -> 0 ->> 'url', v_unit, r.qty - r.cancelled_qty, v_unit * (r.qty - r.cancelled_qty),
            jsonb_build_array(jsonb_build_object('label', '분양 전달', 'amount', 0)),
            coalesce(v_src.shipping_policy_id, (select d.id from public.mall_builder_shipping_policies d where d.store_id = v_src.store_id and d.is_default)));
    v_sub := v_sub + v_unit * (r.qty - r.cancelled_qty);
    -- 본사 재고 차감(거울 상품 재고는 동기화 트리거가 본사 재고로 다시 맞춤)
    if v_src.stock_mode = 'product' then
      if v_sv.id is not null then
        update public.mall_builder_product_variants set stock = greatest(stock - (r.qty - r.cancelled_qty), 0) where id = v_sv.id;
      else
        update public.mall_builder_products set stock = greatest(stock - (r.qty - r.cancelled_qty), 0) where id = v_src.id;
      end if;
    end if;
  end loop;
  -- 배송비는 분양몰 주문과 같게(공급사 배송비 기록 트리거가 이 저장에서 돈다)
  update public.mall_builder_orders set subtotal = v_sub, shipping_fee = o.shipping_fee, total = v_sub + o.shipping_fee where id = v_new;
  update public.mall_builder_orders set forwarded_order_id = v_new where id = o.id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (v_new, null, 'paid', auth.uid(), 'system', '분양몰 ' || s.slug || ' 주문 ' || o.order_no || ' 전달');
  return v_new;
end;
$$;

-- 본사 재고 되돌리기(전달 주문 취소 때)
create or replace function mall_builder_private.resale_restock(p_hq_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select i.product_id, i.variant_id, i.qty - i.cancelled_qty q, p.stock_mode from public.mall_builder_order_items i
             join public.mall_builder_products p on p.id = i.product_id where i.order_id = p_hq_order and i.qty > i.cancelled_qty loop
    continue when r.stock_mode <> 'product';
    if r.variant_id is not null then update public.mall_builder_product_variants set stock = stock + r.q where id = r.variant_id;
    else update public.mall_builder_products set stock = stock + r.q where id = r.product_id; end if;
  end loop;
end;
$$;

-- 분양몰 주문 마진 = 분양몰 상품 금액 − 본사 전달 상품 금액
create or replace function mall_builder_private.resale_margin(p_order uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce((select sum(i.unit_price * greatest(i.qty - i.cancelled_qty, 0)) from public.mall_builder_order_items i where i.order_id = o.id), 0)
       - coalesce((select sum(i.unit_price * greatest(i.qty - i.cancelled_qty, 0)) from public.mall_builder_order_items i where i.order_id = o.forwarded_order_id), 0)
    from public.mall_builder_orders o where o.id = p_order
$$;

-- 분양몰 주문 상태 지킴이: 로그인한 사람(분양자 포함)은 「결제 완료」·준비·발송을 직접 못 바꿈 — 본사 입금 확인 함수·본사 발송 연동만
-- (관리자 화면의 상태 단추는 권한을 높여 도는 함수라 current_user로는 못 거름 → 연동 표시(mall_builder.resale_sync)로 구분.
--  로그인 없이 도는 자동 작업(자동 배송 완료 등)은 막지 않음)
create or replace function public.mall_builder_orders_resale_guard()
returns trigger language plpgsql set search_path = '' as $$
declare v_kind text;
begin
  if new.status is not distinct from old.status or auth.uid() is null or coalesce(current_setting('mall_builder.resale_sync', true), '') = 'on' then return new; end if;
  select s.kind into v_kind from public.mall_builder_stores s where s.id = new.store_id;
  if v_kind = 'resale' and new.status in ('paid', 'preparing', 'shipping') then
    raise exception '분양몰 주문의 입금 확인·발송 상태는 본사가 처리합니다(본사 「분양」 화면·본사 발송을 따라 자동으로 바뀝니다).';
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_resale_guard on public.mall_builder_orders;
create trigger mall_builder_orders_resale_guard before update of status on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_resale_guard();

-- 상태 연동
create or replace function public.mall_builder_orders_resale_link()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_kind text;
  hq public.mall_builder_orders%rowtype;
  ro public.mall_builder_orders%rowtype;
  v_margin bigint;
  v_earn public.mall_builder_resale_ledger%rowtype;
  rank_of constant jsonb := '{"pending_payment":0,"paid":1,"preparing":2,"shipping":3,"delivered":4,"confirmed":5}';
begin
  if new.status is not distinct from old.status then return new; end if;
  select s.kind into v_kind from public.mall_builder_stores s where s.id = new.store_id;

  -- (가) 분양몰 주문이 바뀜
  if v_kind = 'resale' then
    if new.status = 'paid' and new.forwarded_order_id is null then
      perform mall_builder_private.resale_forward(new.id);
    elsif new.forwarded_order_id is not null then
      select * into hq from public.mall_builder_orders x where x.id = new.forwarded_order_id for update;
      if new.status = 'cancelled' and hq.status in ('pending_payment', 'paid', 'preparing') then
        perform mall_builder_private.resale_restock(hq.id);
        update public.mall_builder_orders set status = 'cancelled', updated_at = now() where id = hq.id;
        insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
        values (hq.id, hq.status, 'cancelled', auth.uid(), 'system', '분양몰 주문 ' || new.order_no || ' 취소');
      elsif new.status = 'confirmed' then
        if hq.status = 'delivered' then
          update public.mall_builder_orders set status = 'confirmed', updated_at = now() where id = hq.id;
          insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
          values (hq.id, 'delivered', 'confirmed', auth.uid(), 'system', '분양몰 주문 ' || new.order_no || ' 구매 확정');
        end if;
        v_margin := mall_builder_private.resale_margin(new.id);
        if v_margin > 0 and not exists (select 1 from public.mall_builder_resale_ledger l where l.order_id = new.id and l.kind = 'earn') then
          perform mall_builder_private.resale_ledger_add(new.store_id, new.id, null, 'earn', v_margin, '주문 ' || new.order_no || ' 구매 확정 마진');
        end if;
      elsif new.status = 'returned' then
        if hq.status in ('delivered', 'confirmed') then
          update public.mall_builder_orders set status = 'returned', updated_at = now() where id = hq.id;
          insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
          values (hq.id, hq.status, 'returned', auth.uid(), 'system', '분양몰 주문 ' || new.order_no || ' 반품');
        end if;
      end if;
    end if;
    -- 확정 뒤 반품·취소면 마진 회수(한 번만)
    if new.status in ('cancelled', 'returned') then
      for v_earn in select * from public.mall_builder_resale_ledger l where l.order_id = new.id and l.kind = 'earn' loop
        if not exists (select 1 from public.mall_builder_resale_ledger l where l.order_id = new.id and l.kind = 'reclaim') then
          perform mall_builder_private.resale_ledger_add(new.store_id, new.id, null, 'reclaim', -v_earn.amount, '주문 ' || new.order_no || ' 반품·취소 — 마진 회수');
        end if;
      end loop;
    end if;
    return new;
  end if;

  -- (나) 본사 전달 주문이 준비·발송·배송 완료로 바뀜 → 분양몰 주문도 따라감(송장 함께)
  if new.resale_order_id is not null and new.status in ('preparing', 'shipping', 'delivered') then
    select * into ro from public.mall_builder_orders x where x.id = new.resale_order_id for update;
    if ro.id is not null and coalesce((rank_of ->> ro.status)::int, 99) < (rank_of ->> new.status)::int then
      perform set_config('mall_builder.resale_sync', 'on', true);
      update public.mall_builder_orders set status = new.status, courier = new.courier, tracking_no = new.tracking_no, updated_at = now() where id = ro.id;
      insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
      values (ro.id, ro.status, new.status, auth.uid(), 'system', '본사 ' || new.order_no || ' 진행을 따라 바뀜');
      perform set_config('mall_builder.resale_sync', '', true);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_resale_link on public.mall_builder_orders;
create trigger mall_builder_orders_resale_link after update of status on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_resale_link();

-- 본사(원본 몰 주문 권한): 분양몰 주문 목록(입금 대기 먼저)
create or replace function public.mall_builder_resale_orders(p_source_store_id uuid)
returns table (id uuid, store_slug text, store_name text, order_no text, status text, total bigint, depositor text, created_at timestamptz, forwarded_order_id uuid, margin bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_source_store_id, 'orders') then raise exception '권한이 없습니다.'; end if;
  return query
    select o.id, s.slug, s.name, o.order_no, o.status, o.total, o.depositor, o.created_at, o.forwarded_order_id, mall_builder_private.resale_margin(o.id)
      from public.mall_builder_orders o join public.mall_builder_stores s on s.id = o.store_id
     where s.source_store_id = p_source_store_id
     order by (o.status = 'pending_payment') desc, o.created_at desc
     limit 200;
end;
$$;

-- 본사: 분양몰 주문 입금 확인(→ 전달 주문 생성)
create or replace function public.mall_builder_resale_confirm_payment(p_order_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare o public.mall_builder_orders%rowtype; s public.mall_builder_stores%rowtype;
begin
  select * into o from public.mall_builder_orders x where x.id = p_order_id for update;
  select * into s from public.mall_builder_stores x where x.id = o.store_id;
  if o.id is null or s.kind <> 'resale' or auth.uid() is null or not public.mall_builder_staff_can(s.source_store_id, 'orders') then raise exception '분양몰 주문을 찾을 수 없습니다.'; end if;
  if o.status <> 'pending_payment' then raise exception '입금 대기 주문만 입금 확인할 수 있습니다.'; end if;
  perform set_config('mall_builder.resale_sync', 'on', true);
  update public.mall_builder_orders set status = 'paid', updated_at = now() where id = o.id;
  perform set_config('mall_builder.resale_sync', '', true);
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (o.id, 'pending_payment', 'paid', auth.uid(), 'staff', '본사 입금 확인');
  return (select x.forwarded_order_id from public.mall_builder_orders x where x.id = o.id);
end;
$$;

-- 분양자: 출금 신청(잔액에서 바로 빠짐)
create or replace function public.mall_builder_resale_payout_request(p_store_id uuid, p_amount bigint, p_bank jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.mall_builder_stores%rowtype; v_bal bigint; v_id uuid;
begin
  select * into s from public.mall_builder_stores x where x.id = p_store_id;
  if s.id is null or s.kind <> 'resale' or auth.uid() is null or not public.mall_builder_staff_can(s.id, 'owner') then raise exception '분양몰을 찾을 수 없습니다.'; end if;
  if p_amount is null or p_amount < 10000 then raise exception '출금은 10,000원부터 신청할 수 있습니다.'; end if;
  perform pg_advisory_xact_lock(hashtext('mall_builder_resale_ledger:' || s.id::text));
  select coalesce(sum(l.amount), 0) into v_bal from public.mall_builder_resale_ledger l where l.store_id = s.id;
  if p_amount > v_bal then raise exception '잔액(%원)보다 많이 신청할 수 없습니다.', v_bal; end if;
  if exists (select 1 from public.mall_builder_resale_payouts p where p.store_id = s.id and p.status = 'requested') then raise exception '처리 중인 출금 신청이 있습니다.'; end if;
  insert into public.mall_builder_resale_payouts (store_id, source_store_id, amount, bank_name, bank_account, bank_holder)
  values (s.id, s.source_store_id, p_amount, btrim(coalesce(p_bank ->> 'bank_name', '')), btrim(coalesce(p_bank ->> 'bank_account', '')), btrim(coalesce(p_bank ->> 'bank_holder', '')))
  returning id into v_id;
  perform mall_builder_private.resale_ledger_add(s.id, null, v_id, 'payout', -p_amount, '출금 신청');
  return v_id;
end;
$$;

-- 본사: 출금 지급 완료 / 반려(잔액 돌려줌)
create or replace function public.mall_builder_resale_payout_decide(p_id uuid, p_action text, p_memo text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.mall_builder_resale_payouts%rowtype;
begin
  select * into p from public.mall_builder_resale_payouts x where x.id = p_id for update;
  if p.id is null or auth.uid() is null or not public.mall_builder_staff_can(p.source_store_id, 'owner') then raise exception '출금 신청을 찾을 수 없습니다.'; end if;
  if p.status <> 'requested' then raise exception '이미 처리된 출금 신청입니다.'; end if;
  if p_action = 'paid' then
    update public.mall_builder_resale_payouts set status = 'paid', memo = left(btrim(coalesce(p_memo, '')), 200), decided_at = now() where id = p.id;
  elsif p_action = 'reject' then
    if btrim(coalesce(p_memo, '')) = '' then raise exception '반려 사유를 적어 주세요.'; end if;
    update public.mall_builder_resale_payouts set status = 'rejected', memo = left(btrim(p_memo), 200), decided_at = now() where id = p.id;
    perform mall_builder_private.resale_ledger_add(p.store_id, null, p.id, 'refund', p.amount, '출금 반려 — 잔액으로 돌려줌');
  else
    raise exception '알 수 없는 처리입니다.';
  end if;
  perform mall_builder_private.staff_log(p.source_store_id, 'resale_payout_' || p_action, 'resale_payout', p.id::text, p.amount::text);
end;
$$;

revoke all on function mall_builder_private.resale_ledger_add(uuid, uuid, uuid, text, bigint, text) from public, anon, authenticated;
revoke all on function mall_builder_private.resale_forward(uuid) from public, anon, authenticated;
revoke all on function mall_builder_private.resale_restock(uuid) from public, anon, authenticated;
revoke all on function mall_builder_private.resale_margin(uuid) from public, anon, authenticated;
revoke all on function public.mall_builder_orders_resale_guard() from public, anon, authenticated;
revoke all on function public.mall_builder_orders_resale_link() from public, anon, authenticated;
revoke all on function public.mall_builder_resale_orders(uuid) from public, anon;
revoke all on function public.mall_builder_resale_confirm_payment(uuid) from public, anon;
revoke all on function public.mall_builder_resale_payout_request(uuid, bigint, jsonb) from public, anon;
revoke all on function public.mall_builder_resale_payout_decide(uuid, text, text) from public, anon;
grant execute on function public.mall_builder_resale_orders(uuid) to authenticated;
grant execute on function public.mall_builder_resale_confirm_payment(uuid) to authenticated;
grant execute on function public.mall_builder_resale_payout_request(uuid, bigint, jsonb) to authenticated;
grant execute on function public.mall_builder_resale_payout_decide(uuid, text, text) to authenticated;
