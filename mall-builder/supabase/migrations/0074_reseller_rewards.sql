-- AI 쇼핑몰 빌더 M1-6 — 리셀러 리워드 품목·상태 (2026-11-14 마스터 플랜 §4 M1-6, 리워드 플랜 §0·§1 「프로셀과 같게」)
-- 리워드 = (품목 금액 − 쿠폰 할인 나눔) × (상품 리셀러율 + 리셀러 추가율), 포인트 결제·배송비 제외, 율은 만들 때 고정.
-- 상태: 지급 예정(pending, 결제 확인 때 만듦) → 구매 확정 때 지급 완료(paid, 잔고 적립 — 그때 부분 취소·쿠폰 변경을 반영해 금액 다시 계산)
--       확정 전 취소·반품 → 보류(held) → 운영자 지급(paid, 조정 적립) 또는 삭제(deleted). 확정 뒤 반품은 자동 회수하지 않고 직권 차감.
-- 대상: 주문에 리셀러가 기록된 주문(0072). 리셀러가 기록되지 않은 옛 주문은 D33 방식(가입 연결 × 리셀러율) 그대로.
-- 재사용: 장부·잔고·출금(D33 0052 reseller_add), 상품 리셀러율(0068 product_supply.reseller_rate). 추가·함수 교체만(drop 없음).

-- 1. 리워드 품목 표
create table if not exists public.mall_builder_reseller_rewards (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  reseller_id uuid not null references public.mall_builder_resellers (id) on delete cascade,
  order_id uuid not null references public.mall_builder_orders (id) on delete cascade,
  order_item_id uuid not null unique references public.mall_builder_order_items (id) on delete cascade,
  product_id uuid,
  name_snapshot text not null default '',
  base_amount bigint not null default 0 check (base_amount >= 0),
  product_rate numeric(5, 2) not null default 0 check (product_rate >= 0 and product_rate <= 50),
  reseller_rate numeric(5, 2) not null default 0 check (reseller_rate >= 0 and reseller_rate <= 50),
  amount bigint not null default 0 check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'held', 'deleted')),
  note text not null default '' check (char_length(note) <= 300),
  ledger_id uuid references public.mall_builder_reseller_ledger (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);
create index if not exists mall_builder_reseller_rewards_r on public.mall_builder_reseller_rewards (reseller_id, status, created_at desc);
create index if not exists mall_builder_reseller_rewards_store on public.mall_builder_reseller_rewards (store_id, status, created_at desc);
create index if not exists mall_builder_reseller_rewards_order on public.mall_builder_reseller_rewards (order_id);
alter table public.mall_builder_reseller_rewards enable row level security;
drop policy if exists mall_builder_reseller_rewards_read on public.mall_builder_reseller_rewards;
create policy mall_builder_reseller_rewards_read on public.mall_builder_reseller_rewards for select
  using (public.mall_builder_staff_can(store_id, 'customers') or mall_builder_private.is_my_reseller(reseller_id));

-- 2. 품목별 기준 금액: 남은 수량 금액 − 쿠폰 할인(쿠폰 대상 품목의 남은 금액 비율로 나눔). 포인트·배송비는 빼지 않음
create or replace function mall_builder_private.reward_bases(p_order uuid)
returns table (item_id uuid, base bigint)
language sql stable security definer set search_path = '' as $$
  with o as (select coalesce(x.coupon_discount, 0) as coupon from public.mall_builder_orders x where x.id = p_order),
  net as (
    select i.id, coalesce(i.coupon_eligible, true) as elig,
           case when i.qty > 0 then (i.line_total * greatest(i.qty - coalesce(i.cancelled_qty, 0), 0)) / i.qty else 0 end as net
      from public.mall_builder_order_items i where i.order_id = p_order
  ),
  tot as (select coalesce(sum(n.net) filter (where n.elig), 0) as elig_sum from net n)
  select n.id,
         greatest(n.net - case when n.elig and t.elig_sum > 0 then (o.coupon * n.net) / t.elig_sum else 0 end, 0)::bigint
    from net n cross join tot t cross join o;
$$;
revoke all on function mall_builder_private.reward_bases(uuid) from public, anon, authenticated;

-- 3. 지급 예정 만들기(여러 번 불러도 품목당 한 줄) — 율은 이때 고정
create or replace function mall_builder_private.reward_make(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  r public.mall_builder_resellers%rowtype;
begin
  select * into o from public.mall_builder_orders x where x.id = p_order;
  if o.id is null or o.reseller_id is null then return; end if;
  select * into r from public.mall_builder_resellers x where x.id = o.reseller_id and x.active;
  if r.id is null then return; end if;
  insert into public.mall_builder_reseller_rewards (store_id, reseller_id, order_id, order_item_id, product_id, name_snapshot, base_amount, product_rate, reseller_rate, amount)
  select o.store_id, r.id, o.id, i.id, i.product_id, coalesce(i.name_snapshot, ''), b.base,
         coalesce(ps.reseller_rate, 0), r.rate,
         floor(b.base * (coalesce(ps.reseller_rate, 0) + r.rate) / 100)::bigint
    from public.mall_builder_order_items i
    join mall_builder_private.reward_bases(o.id) b on b.item_id = i.id
    left join public.mall_builder_product_supply ps on ps.product_id = i.product_id
   where i.order_id = o.id and coalesce(ps.reseller_rate, 0) + r.rate > 0
  on conflict (order_item_id) do nothing;
end;
$$;
revoke all on function mall_builder_private.reward_make(uuid) from public, anon, authenticated;

-- 4. 구매 확정: 지급 예정 → 지급 완료(금액은 지금 남은 수량·쿠폰으로 다시 계산, 고정한 율로), 주문당 장부 적립 1줄
create or replace function mall_builder_private.reward_settle(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_sum bigint;
  v_ledger uuid;
begin
  select * into o from public.mall_builder_orders x where x.id = p_order;
  update public.mall_builder_reseller_rewards w
     set base_amount = b.base, amount = floor(b.base * (w.product_rate + w.reseller_rate) / 100)::bigint
    from mall_builder_private.reward_bases(p_order) b
   where w.order_id = p_order and w.status = 'pending' and b.item_id = w.order_item_id;
  select coalesce(sum(w.amount), 0) into v_sum from public.mall_builder_reseller_rewards w where w.order_id = p_order and w.status = 'pending';
  if v_sum > 0 and not exists (select 1 from public.mall_builder_reseller_ledger l where l.order_id = p_order and l.kind = 'earn') then
    perform mall_builder_private.reseller_add(o.store_id, o.reseller_id, o.id, null, 'earn', v_sum, '주문 ' || o.order_no || ' 구매 확정 리워드');
    select l.id into v_ledger from public.mall_builder_reseller_ledger l where l.order_id = p_order and l.kind = 'earn';
  end if;
  update public.mall_builder_reseller_rewards w set status = 'paid', ledger_id = v_ledger, decided_at = now()
   where w.order_id = p_order and w.status = 'pending';
end;
$$;
revoke all on function mall_builder_private.reward_settle(uuid) from public, anon, authenticated;

-- 5. 주문 상태 트리거(0052·0072 교체): 리셀러가 기록된 주문 = 리워드, 아니면 옛 D33 방식
create or replace function public.mall_builder_orders_reseller()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r public.mall_builder_resellers%rowtype;
  v_amt bigint;
  v_earn public.mall_builder_reseller_ledger%rowtype;
begin
  if new.status is not distinct from old.status then return new; end if;

  -- (가) 리셀러가 기록된 주문(0072 이후) — 품목 리워드
  if new.reseller_id is not null then
    if new.status in ('paid', 'preparing', 'shipping', 'delivered', 'confirmed') then
      perform mall_builder_private.reward_make(new.id);
    end if;
    if new.status = 'confirmed' then
      perform mall_builder_private.reward_settle(new.id);
    elsif new.status in ('cancelled', 'returned') and old.status <> 'confirmed' then
      update public.mall_builder_reseller_rewards set status = 'held', decided_at = now(),
             note = left('주문 ' || new.order_no || ' ' || public.mall_builder_status_label(new.status) || '(구매 확정 전) — 운영자 확인 대기', 300)
       where order_id = new.id and status = 'pending';
    end if;
    return new; -- 확정 뒤 반품은 자동 회수하지 않음(직권 차감)
  end if;

  -- (나) 옛 주문 — 가입 때 연결된 리셀러 × 리셀러율(D33)
  if new.customer_id is null or coalesce(new.is_guest, false) then return new; end if;
  if new.status = 'confirmed' then
    select rs.* into r from public.mall_builder_store_customers c join public.mall_builder_resellers rs on rs.id = c.reseller_id
     where c.id = new.customer_id and rs.active;
    if r.id is null or r.customer_id is not distinct from new.customer_id then return new; end if;
    v_amt := mall_builder_private.commission_of(new.total, new.shipping_fee, r.rate);
    if v_amt > 0 and not exists (select 1 from public.mall_builder_reseller_ledger l where l.order_id = new.id and l.kind = 'earn') then
      perform mall_builder_private.reseller_add(new.store_id, r.id, new.id, null, 'earn', v_amt, '주문 ' || new.order_no || ' 구매 확정');
    end if;
  elsif new.status in ('cancelled', 'returned') then
    select * into v_earn from public.mall_builder_reseller_ledger l where l.order_id = new.id and l.kind = 'earn';
    if v_earn.id is not null and not exists (select 1 from public.mall_builder_reseller_ledger l where l.order_id = new.id and l.kind = 'reclaim') then
      perform mall_builder_private.reseller_add(new.store_id, v_earn.reseller_id, new.id, null, 'reclaim', -v_earn.amount, '주문 ' || new.order_no || ' ' || public.mall_builder_status_label(new.status) || ' — 회수');
    end if;
  end if;
  return new;
end $$;

-- 6. 몰 대표: 보류 리워드 지급(잔고에 조정 적립) / 삭제
create or replace function public.mall_builder_reward_decide(p_id uuid, p_action text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  w public.mall_builder_reseller_rewards%rowtype;
  v_no text;
  v_ledger uuid;
begin
  select * into w from public.mall_builder_reseller_rewards x where x.id = p_id for update;
  if w.id is null or auth.uid() is null or not coalesce(public.mall_builder_staff_can(w.store_id, 'owner'), false) then raise exception '리워드를 찾을 수 없습니다.'; end if;
  if w.status <> 'held' then raise exception '보류 중인 리워드만 지급하거나 삭제할 수 있습니다.'; end if;
  select o.order_no into v_no from public.mall_builder_orders o where o.id = w.order_id;
  if p_action = 'pay' then
    if w.amount > 0 then
      perform mall_builder_private.reseller_add(w.store_id, w.reseller_id, w.order_id, null, 'adjust', w.amount,
              left('보류 리워드 지급 — 주문 ' || coalesce(v_no, '') || ' ' || w.name_snapshot || coalesce(' · ' || nullif(btrim(p_note), ''), ''), 200));
      select l.id into v_ledger from public.mall_builder_reseller_ledger l where l.reseller_id = w.reseller_id order by l.created_at desc, l.id desc limit 1;
    end if;
    update public.mall_builder_reseller_rewards set status = 'paid', ledger_id = v_ledger, decided_at = now(), decided_by = auth.uid(),
           note = left(coalesce(nullif(btrim(p_note), ''), note), 300) where id = w.id;
  elsif p_action = 'delete' then
    update public.mall_builder_reseller_rewards set status = 'deleted', decided_at = now(), decided_by = auth.uid(),
           note = left(coalesce(nullif(btrim(p_note), ''), note), 300) where id = w.id;
  else
    raise exception '알 수 없는 처리입니다.';
  end if;
  perform mall_builder_private.staff_log(w.store_id, 'reward_' || p_action, 'reseller_reward', w.id::text, coalesce(v_no, ''));
end;
$$;

-- 7. 몰 대표: 직권 지급(+)·차감(−) — 사유 필수, 차감 뒤 잔고가 음수면 막음
create or replace function public.mall_builder_reseller_adjust(p_store_id uuid, p_reseller_id uuid, p_amount bigint, p_note text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_note text := left(btrim(coalesce(p_note, '')), 200);
  v_bal bigint;
begin
  if auth.uid() is null or not coalesce(public.mall_builder_staff_can(p_store_id, 'owner'), false) then raise exception '몰 대표만 할 수 있습니다.'; end if;
  if not exists (select 1 from public.mall_builder_resellers r where r.id = p_reseller_id and r.store_id = p_store_id) then raise exception '리셀러를 찾을 수 없습니다.'; end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 100000000 then raise exception '금액을 1원 이상 1억 원 이하로 적어 주세요(차감은 음수).'; end if;
  if v_note = '' then raise exception '사유를 적어 주세요(리셀러 내역에 보입니다).'; end if;
  v_bal := mall_builder_private.reseller_add(p_store_id, p_reseller_id, null, null, 'adjust', p_amount,
           (case when p_amount > 0 then '직권 지급 — ' else '직권 차감 — ' end) || v_note);
  if v_bal < 0 then raise exception '차감하면 잔고가 0원보다 적어집니다(지금 차감 가능 금액을 확인해 주세요).'; end if;
  perform mall_builder_private.staff_log(p_store_id, 'reseller_adjust', 'reseller', p_reseller_id::text, p_amount::text);
  return v_bal;
end;
$$;

revoke all on function public.mall_builder_reward_decide(uuid, text, text) from public, anon;
revoke all on function public.mall_builder_reseller_adjust(uuid, uuid, bigint, text) from public, anon;
grant execute on function public.mall_builder_reward_decide(uuid, text, text) to authenticated;
grant execute on function public.mall_builder_reseller_adjust(uuid, uuid, bigint, text) to authenticated;
