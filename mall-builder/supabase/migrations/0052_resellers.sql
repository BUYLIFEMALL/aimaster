-- D33 리셀러·제휴 판매(2026-11-11 주인님 「추천안 4가지 그대로」)
--   운영자가 기존 손님을 리셀러로 지정(코드·수수료율) → 리셀러 링크로 들어와 30일 안 가입한 손님은 그 리셀러와 영구 연결(운영자가 바꿀 수 있음)
--   연결된 손님 주문이 구매 확정되면 (결제 − 배송비) × 수수료율 적립, 그 뒤 반품·취소면 회수. 리셀러 자기 주문은 적립 안 함
--   출금: 리셀러 신청(잔액에서 바로 빠짐) → 운영자가 직접 송금 후 「지급 완료」, 반려면 돌려줌. 자동 송금 없음, 원천징수는 화면 안내만
-- 쓰기는 모두 함수·트리거로(로그인 사용자가 표를 직접 고칠 수 없음). 읽기: 리셀러 본인 + 「손님」 권한 직원

create table if not exists public.mall_builder_resellers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  customer_id uuid not null unique references public.mall_builder_store_customers (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{4,12}$'),
  rate numeric(5, 2) not null check (rate > 0 and rate <= 50),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, code)
);

alter table public.mall_builder_store_customers add column if not exists reseller_id uuid references public.mall_builder_resellers (id) on delete set null;
alter table public.mall_builder_store_customers add column if not exists reseller_ref text; -- 가입 때 넣는 입력 칸(트리거가 확인하고 비움)
create index if not exists mall_builder_store_customers_reseller on public.mall_builder_store_customers (reseller_id);

create table if not exists public.mall_builder_reseller_ledger (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  reseller_id uuid not null references public.mall_builder_resellers (id) on delete cascade,
  order_id uuid references public.mall_builder_orders (id) on delete set null,
  payout_id uuid,
  kind text not null check (kind in ('earn', 'reclaim', 'payout', 'payout_cancel', 'adjust')),
  amount bigint not null,
  balance_after bigint not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists mall_builder_reseller_ledger_order_once on public.mall_builder_reseller_ledger (order_id, kind) where kind in ('earn', 'reclaim');
create index if not exists mall_builder_reseller_ledger_r on public.mall_builder_reseller_ledger (reseller_id, created_at desc);

create table if not exists public.mall_builder_reseller_payouts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  reseller_id uuid not null references public.mall_builder_resellers (id) on delete cascade,
  amount bigint not null check (amount > 0),
  bank_name text not null,
  bank_account text not null,
  bank_holder text not null,
  status text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  reason text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);

alter table public.mall_builder_resellers enable row level security;
alter table public.mall_builder_reseller_ledger enable row level security;
alter table public.mall_builder_reseller_payouts enable row level security;

create or replace function mall_builder_private.is_my_reseller(p_reseller_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mall_builder_resellers r join public.mall_builder_store_customers c on c.id = r.customer_id
                  where r.id = p_reseller_id and c.user_id = auth.uid())
$$;

drop policy if exists mall_builder_resellers_read on public.mall_builder_resellers;
create policy mall_builder_resellers_read on public.mall_builder_resellers for select
  using (public.mall_builder_staff_can(store_id, 'customers') or mall_builder_private.is_my_reseller(id));
drop policy if exists mall_builder_reseller_ledger_read on public.mall_builder_reseller_ledger;
create policy mall_builder_reseller_ledger_read on public.mall_builder_reseller_ledger for select
  using (public.mall_builder_staff_can(store_id, 'customers') or mall_builder_private.is_my_reseller(reseller_id));
drop policy if exists mall_builder_reseller_payouts_read on public.mall_builder_reseller_payouts;
create policy mall_builder_reseller_payouts_read on public.mall_builder_reseller_payouts for select
  using (public.mall_builder_staff_can(store_id, 'customers') or mall_builder_private.is_my_reseller(reseller_id));

-- 원장 한 줄 넣기(리셀러별 잠금으로 잔액 계산이 겹치지 않게)
create or replace function mall_builder_private.reseller_add(p_store uuid, p_reseller uuid, p_order uuid, p_payout uuid, p_kind text, p_amount bigint, p_note text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_bal bigint;
begin
  perform pg_advisory_xact_lock(hashtext('mall_builder_reseller:' || p_reseller::text));
  select coalesce(sum(amount), 0) into v_bal from public.mall_builder_reseller_ledger where reseller_id = p_reseller;
  v_bal := v_bal + p_amount;
  insert into public.mall_builder_reseller_ledger (store_id, reseller_id, order_id, payout_id, kind, amount, balance_after, note)
  values (p_store, p_reseller, p_order, p_payout, p_kind, p_amount, v_bal, left(coalesce(p_note, ''), 200));
  return v_bal;
end $$;

-- 손님 가입·수정: 연결 칸 보호(로그인 사용자 직접 변경 불가), 가입 때 코드로 연결
create or replace function public.mall_builder_store_customers_reseller()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then new.reseller_ref := null; return new; end if;
  if tg_op = 'INSERT' then
    new.reseller_id := (select r.id from public.mall_builder_resellers r
                         where r.store_id = new.store_id and r.active and r.code = upper(btrim(coalesce(new.reseller_ref, ''))));
  else
    new.reseller_id := old.reseller_id;
  end if;
  new.reseller_ref := null;
  return new;
end $$;
drop trigger if exists mall_builder_store_customers_reseller on public.mall_builder_store_customers;
create trigger mall_builder_store_customers_reseller before insert or update on public.mall_builder_store_customers
  for each row execute function public.mall_builder_store_customers_reseller();

-- 주문 상태: 구매 확정이면 적립, 그 뒤 반품·취소면 회수(한 주문 한 번씩)
create or replace function public.mall_builder_orders_reseller()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r public.mall_builder_resellers%rowtype;
  v_amt bigint;
  v_earn public.mall_builder_reseller_ledger%rowtype;
begin
  if new.status is not distinct from old.status or new.customer_id is null or coalesce(new.is_guest, false) then return new; end if;
  if new.status = 'confirmed' then
    select rs.* into r from public.mall_builder_store_customers c join public.mall_builder_resellers rs on rs.id = c.reseller_id
     where c.id = new.customer_id and rs.active;
    if r.id is null or r.customer_id = new.customer_id then return new; end if;
    v_amt := floor(greatest(0, new.total - new.shipping_fee) * r.rate / 100.0)::bigint;
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
drop trigger if exists mall_builder_orders_reseller on public.mall_builder_orders;
create trigger mall_builder_orders_reseller after update of status on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_reseller();

-- 운영자(「손님」 권한): 리셀러 지정·수정(코드·율·켜기/끄기)
create or replace function public.mall_builder_reseller_set(p_store_id uuid, p_customer_id uuid, p_code text, p_rate numeric, p_active boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if not public.mall_builder_staff_can(p_store_id, 'customers') then raise exception '「손님」 권한이 있는 직원만 리셀러를 지정할 수 있습니다.'; end if;
  if not exists (select 1 from public.mall_builder_store_customers c where c.id = p_customer_id and c.store_id = p_store_id) then raise exception '이 몰 손님이 아닙니다.'; end if;
  if v_code !~ '^[A-Z0-9]{4,12}$' then raise exception '리셀러 코드는 영문·숫자 4~12자로 정해 주세요.'; end if;
  if p_rate is null or p_rate <= 0 or p_rate > 50 then raise exception '수수료율은 0보다 크고 50%% 이하로 입력해 주세요.'; end if;
  if exists (select 1 from public.mall_builder_resellers r where r.store_id = p_store_id and r.code = v_code and r.customer_id <> p_customer_id) then raise exception '이미 쓰는 리셀러 코드입니다: %', v_code; end if;
  insert into public.mall_builder_resellers (store_id, customer_id, code, rate, active)
  values (p_store_id, p_customer_id, v_code, round(p_rate, 2), coalesce(p_active, true))
  on conflict (customer_id) do update set code = excluded.code, rate = excluded.rate, active = excluded.active, updated_at = now()
  returning id into v_id;
  return v_id;
end $$;

-- 운영자(「손님」 권한): 손님의 연결 리셀러 바꾸기(빼기 = null)
create or replace function public.mall_builder_customer_set_reseller(p_customer_id uuid, p_reseller_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_store uuid;
begin
  select c.store_id into v_store from public.mall_builder_store_customers c where c.id = p_customer_id;
  if v_store is null or not public.mall_builder_staff_can(v_store, 'customers') then raise exception '「손님」 권한이 있는 직원만 바꿀 수 있습니다.'; end if;
  if p_reseller_id is not null and not exists (select 1 from public.mall_builder_resellers r where r.id = p_reseller_id and r.store_id = v_store and r.customer_id <> p_customer_id) then
    raise exception '이 몰의 다른 손님 리셀러만 연결할 수 있습니다.';
  end if;
  update public.mall_builder_store_customers set reseller_id = p_reseller_id where id = p_customer_id;
end $$;

-- 리셀러 본인: 요약(연결 손님 수·잔액·이번 달 적립·처리 대기 출금)
create or replace function public.mall_builder_reseller_my_summary(p_store_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when r.id is null then null else jsonb_build_object(
    'id', r.id, 'code', r.code, 'rate', r.rate, 'active', r.active,
    'linked', (select count(*) from public.mall_builder_store_customers c2 where c2.reseller_id = r.id),
    'balance', coalesce((select sum(l.amount) from public.mall_builder_reseller_ledger l where l.reseller_id = r.id), 0),
    'month_earned', coalesce((select sum(l.amount) from public.mall_builder_reseller_ledger l where l.reseller_id = r.id and l.kind in ('earn', 'reclaim')
                               and l.created_at >= date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'), 0),
    'pending', coalesce((select sum(p.amount) from public.mall_builder_reseller_payouts p where p.reseller_id = r.id and p.status = 'requested'), 0)
  ) end
  from public.mall_builder_store_customers c
  left join public.mall_builder_resellers r on r.customer_id = c.id
  where c.store_id = p_store_id and c.user_id = auth.uid()
$$;

-- 리셀러 본인: 출금 신청(잔액에서 바로 빠짐, 처리 대기 1건까지)
create or replace function public.mall_builder_reseller_request_payout(p_store_id uuid, p_amount bigint, p_bank_name text, p_bank_account text, p_bank_holder text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.mall_builder_resellers%rowtype; v_bal bigint; v_id uuid;
begin
  select rs.* into r from public.mall_builder_resellers rs join public.mall_builder_store_customers c on c.id = rs.customer_id
   where rs.store_id = p_store_id and c.user_id = auth.uid();
  if r.id is null then raise exception '리셀러만 출금을 신청할 수 있습니다.'; end if;
  perform pg_advisory_xact_lock(hashtext('mall_builder_reseller:' || r.id::text));
  if exists (select 1 from public.mall_builder_reseller_payouts p where p.reseller_id = r.id and p.status = 'requested') then raise exception '처리 대기 중인 출금 신청이 있습니다. 처리된 뒤 다시 신청해 주세요.'; end if;
  select coalesce(sum(amount), 0) into v_bal from public.mall_builder_reseller_ledger where reseller_id = r.id;
  if p_amount is null or p_amount < 10000 then raise exception '출금은 10,000원 이상부터 신청할 수 있습니다.'; end if;
  if p_amount > v_bal then raise exception '출금 가능 금액(%원)보다 많습니다.', to_char(v_bal, 'FM999,999,999,990'); end if;
  if char_length(btrim(coalesce(p_bank_name, ''))) not between 1 and 30 or char_length(btrim(coalesce(p_bank_account, ''))) not between 5 and 40
     or char_length(btrim(coalesce(p_bank_holder, ''))) not between 1 and 30 then raise exception '은행·계좌번호·예금주를 입력해 주세요.'; end if;
  insert into public.mall_builder_reseller_payouts (store_id, reseller_id, amount, bank_name, bank_account, bank_holder)
  values (p_store_id, r.id, p_amount, btrim(p_bank_name), btrim(p_bank_account), btrim(p_bank_holder)) returning id into v_id;
  perform mall_builder_private.reseller_add(p_store_id, r.id, null, v_id, 'payout', -p_amount, '출금 신청');
  return v_id;
end $$;

-- 운영자(「손님」 권한): 출금 처리 — 지급 완료(직접 송금한 뒤) 또는 반려(잔액 돌려줌)
create or replace function public.mall_builder_reseller_decide_payout(p_id uuid, p_action text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.mall_builder_reseller_payouts%rowtype;
begin
  select * into p from public.mall_builder_reseller_payouts where id = p_id for update;
  if p.id is null or not public.mall_builder_staff_can(p.store_id, 'customers') then raise exception '출금 신청을 찾을 수 없습니다.'; end if;
  if p.status <> 'requested' then raise exception '이미 처리한 신청입니다.'; end if;
  if p_action = 'paid' then
    update public.mall_builder_reseller_payouts set status = 'paid', decided_at = now(), decided_by = auth.uid(), reason = nullif(btrim(coalesce(p_reason, '')), '') where id = p_id;
  elsif p_action = 'rejected' then
    if char_length(btrim(coalesce(p_reason, ''))) < 2 then raise exception '반려 사유를 적어 주세요.'; end if;
    update public.mall_builder_reseller_payouts set status = 'rejected', decided_at = now(), decided_by = auth.uid(), reason = left(btrim(p_reason), 200) where id = p_id;
    perform mall_builder_private.reseller_add(p.store_id, p.reseller_id, null, p.id, 'payout_cancel', p.amount, '출금 반려 — 돌려줌');
  else
    raise exception '알 수 없는 처리입니다.';
  end if;
end $$;
