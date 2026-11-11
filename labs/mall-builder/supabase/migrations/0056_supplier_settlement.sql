-- AI 쇼핑몰 빌더 D37 — 입점형 마켓플레이스 4단계: 공급사 정산(공급가 방식)
-- 플랜 docs/PLAN_20261111_MARKETPLACE.md. AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만. 추가만(drop 없음).
-- 구매 확정 → 공급사별 (공급가 × 남은 수량) 적립, 확정 뒤 취소·반품 → 차감(각 1번만).
-- 운영자(대표)가 직접 송금한 뒤 「지급 완료」 → 잔액에서 뺌. 읽기: 주문 권한 운영자·공급사 본인. 쓰기: 트리거·함수로만.

create table if not exists public.mall_builder_supplier_settlements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  supplier_id uuid not null references public.mall_builder_suppliers (id),
  amount bigint not null check (amount > 0),
  memo text not null default '' check (char_length(memo) <= 200),
  paid_at timestamptz not null default now(),
  paid_by uuid
);
create index if not exists mall_builder_supplier_settlements_supplier on public.mall_builder_supplier_settlements (supplier_id, paid_at desc);
alter table public.mall_builder_supplier_settlements enable row level security;

create table if not exists public.mall_builder_supplier_ledger (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  supplier_id uuid not null references public.mall_builder_suppliers (id),
  order_id uuid references public.mall_builder_orders (id) on delete set null,
  settlement_id uuid references public.mall_builder_supplier_settlements (id),
  kind text not null check (kind in ('earn', 'reclaim', 'settle', 'adjust')),
  amount bigint not null,
  balance_after bigint not null,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_supplier_ledger_supplier on public.mall_builder_supplier_ledger (supplier_id, created_at desc);
create unique index if not exists mall_builder_supplier_ledger_once on public.mall_builder_supplier_ledger (order_id, supplier_id, kind) where kind in ('earn', 'reclaim');
alter table public.mall_builder_supplier_ledger enable row level security;

create policy mall_builder_supplier_ledger_read on public.mall_builder_supplier_ledger for select
  using (public.mall_builder_staff_can(store_id, 'orders')
         or exists (select 1 from public.mall_builder_suppliers x where x.id = mall_builder_supplier_ledger.supplier_id and x.user_id = (select auth.uid())));
create policy mall_builder_supplier_settlements_read on public.mall_builder_supplier_settlements for select
  using (public.mall_builder_staff_can(store_id, 'orders')
         or exists (select 1 from public.mall_builder_suppliers x where x.id = mall_builder_supplier_settlements.supplier_id and x.user_id = (select auth.uid())));

-- 장부 한 줄 쓰기(공급사 줄을 잠가 잔액을 차례로 계산)
create or replace function mall_builder_private.supplier_ledger_add(p_store uuid, p_supplier uuid, p_order uuid, p_settlement uuid, p_kind text, p_amount bigint, p_note text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_bal bigint;
begin
  perform 1 from public.mall_builder_suppliers x where x.id = p_supplier for update;
  select coalesce(sum(l.amount), 0) into v_bal from public.mall_builder_supplier_ledger l where l.supplier_id = p_supplier;
  insert into public.mall_builder_supplier_ledger (store_id, supplier_id, order_id, settlement_id, kind, amount, balance_after, note)
  values (p_store, p_supplier, p_order, p_settlement, p_kind, p_amount, v_bal + p_amount, left(coalesce(p_note, ''), 200));
  return v_bal + p_amount;
end;
$$;

-- 주문 상태가 바뀔 때: 구매 확정 → 공급사별 적립 / 확정 뒤 취소·반품 → 차감
create or replace function public.mall_builder_orders_supplier_settle()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; v_earn public.mall_builder_supplier_ledger%rowtype;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'confirmed' then
    for r in
      select s.supplier_id, sum(s.supply_price * greatest(i.qty - i.cancelled_qty, 0))::bigint amt
        from public.mall_builder_order_item_supply s join public.mall_builder_order_items i on i.id = s.order_item_id
       where s.order_id = new.id group by s.supplier_id
    loop
      if r.amt > 0 and not exists (select 1 from public.mall_builder_supplier_ledger l where l.order_id = new.id and l.supplier_id = r.supplier_id and l.kind = 'earn') then
        perform mall_builder_private.supplier_ledger_add(new.store_id, r.supplier_id, new.id, null, 'earn', r.amt, '주문 ' || new.order_no || ' 구매 확정');
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
create trigger mall_builder_orders_supplier_settle after update of status on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_supplier_settle();

-- 대표: 송금한 뒤 「지급 완료」(잔액 이하, 메모 선택)
create or replace function public.mall_builder_supplier_settle(p_supplier_id uuid, p_amount bigint, p_memo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare x public.mall_builder_suppliers%rowtype; v_bal bigint; v_id uuid;
begin
  select * into x from public.mall_builder_suppliers s where s.id = p_supplier_id;
  if x.id is null or auth.uid() is null or not public.mall_builder_is_store_owner(x.store_id) then raise exception '공급사 정산 지급은 대표 운영자만 할 수 있습니다.'; end if;
  select coalesce(sum(l.amount), 0) into v_bal from public.mall_builder_supplier_ledger l where l.supplier_id = x.id;
  if p_amount is null or p_amount < 1 then raise exception '지급 금액을 적어 주세요.'; end if;
  if p_amount > v_bal then raise exception '정산 잔액(%원)보다 많이 지급할 수 없습니다.', v_bal; end if;
  insert into public.mall_builder_supplier_settlements (store_id, supplier_id, amount, memo, paid_by)
  values (x.store_id, x.id, p_amount, left(btrim(coalesce(p_memo, '')), 200), auth.uid()) returning id into v_id;
  perform mall_builder_private.supplier_ledger_add(x.store_id, x.id, null, v_id, 'settle', -p_amount, '정산 지급' || case when btrim(coalesce(p_memo, '')) <> '' then ' — ' || left(btrim(p_memo), 100) else '' end);
  perform mall_builder_private.staff_log(x.store_id, 'supplier_settle', 'supplier', x.id::text, p_amount::text);
  return v_id;
end;
$$;

-- ── 권한(별도 마이그레이션 0056_supplier_settlement_grants로 적용) ──
revoke all on function public.mall_builder_supplier_settle(uuid, bigint, text) from public, anon;
grant execute on function public.mall_builder_supplier_settle(uuid, bigint, text) to authenticated;
revoke all on function public.mall_builder_orders_supplier_settle() from public, anon, authenticated;
revoke all on function mall_builder_private.supplier_ledger_add(uuid, uuid, uuid, uuid, text, bigint, text) from public, anon, authenticated;
