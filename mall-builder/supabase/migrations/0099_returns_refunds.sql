-- AI 쇼핑몰 빌더 M2-7 — 반품·취소 강화: 사유·회수 단계·회수 송장·반품비 차감·환불 계좌·환불 대기 (2026-11-15 docs/PLAN_20261115_M2_7_RETURNS.md)
-- 백엔드 DB 번호 0090~0099의 마지막. 다음부터 0100~0109(상호 인수인계 §2 합의 요청).
-- 주인님 결정(2026-11-15): 반품비 = 몰 설정 기본값(settings.return_fee) + 사유별(변심만 기본값, 불량·오배송 0, 승인 때 고칠 수 있음)
--                       환불 계좌 = 앱에서 받고, 환불 완료 때 지움(금액·일시 기록은 남김 — 5년 보관 RETENTION_ORDERS_5Y.md)
-- 주문 상태는 늘리지 않는다(반품 요청 안의 작은 단계 return_step). 추가만(지우기 없음).

alter table public.mall_builder_orders add column if not exists return_reason text check (return_reason in ('change_mind', 'defect', 'wrong_item', 'other'));
alter table public.mall_builder_orders add column if not exists return_memo text not null default '' check (char_length(return_memo) <= 300);
alter table public.mall_builder_orders add column if not exists return_step text check (return_step in ('requested', 'collecting', 'collected'));
alter table public.mall_builder_orders add column if not exists return_courier text not null default '' check (char_length(return_courier) <= 30);
alter table public.mall_builder_orders add column if not exists return_tracking text not null default '' check (char_length(return_tracking) <= 40);
alter table public.mall_builder_orders add column if not exists return_fee bigint not null default 0 check (return_fee >= 0);
alter table public.mall_builder_orders add column if not exists refund_status text not null default 'none' check (refund_status in ('none', 'pending', 'done'));
alter table public.mall_builder_orders add column if not exists refund_amount bigint not null default 0 check (refund_amount >= 0);
alter table public.mall_builder_orders add column if not exists refunded_at timestamptz;
create index if not exists mall_builder_orders_refund_pending on public.mall_builder_orders (store_id) where refund_status = 'pending';

-- 무통장 환불 계좌(주문당 1행) — 주문한 유저 본인과 그 몰 직원만 읽는다. 쓰기는 함수로만. 환불 완료 때 지움
create table if not exists public.mall_builder_refund_accounts (
  order_id uuid primary key references public.mall_builder_orders (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  bank_name text not null check (char_length(btrim(bank_name)) between 1 and 20),
  bank_account text not null check (bank_account ~ '^[0-9-]{6,30}$'),
  bank_holder text not null check (char_length(btrim(bank_holder)) between 1 and 30),
  updated_at timestamptz not null default now()
);
alter table public.mall_builder_refund_accounts enable row level security;
drop policy if exists mall_builder_refund_accounts_read on public.mall_builder_refund_accounts;
create policy mall_builder_refund_accounts_read on public.mall_builder_refund_accounts for select
  using (user_id = (select auth.uid()) or public.mall_builder_is_store_staff(store_id));

/** 무통장 결제 주문인가(카드·외상 아님, 결제가 된 적 있음) */
create or replace function mall_builder_private.is_bank_paid(o public.mall_builder_orders)
returns boolean language sql immutable as $$
  select not o.is_card and not o.is_credit
$$;

-- ── 유저: 반품 요청(사유·메모·무통장이면 환불 계좌) ──
create or replace function public.mall_builder_request_return(p_order_id uuid, p_reason text, p_memo text default '', p_bank jsonb default null)
returns text language plpgsql security definer set search_path = '' as $$
declare o public.mall_builder_orders%rowtype; v_fee bigint := 0;
begin
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found or o.user_id is distinct from auth.uid() then raise exception '주문을 찾을 수 없습니다.'; end if;
  if o.status <> 'delivered' then raise exception '배송 완료된 주문만 반품을 요청할 수 있습니다.'; end if;
  if p_reason not in ('change_mind', 'defect', 'wrong_item', 'other') then raise exception '반품 사유를 골라 주세요.'; end if;
  if p_reason in ('change_mind', 'other') then
    select coalesce(nullif(s.settings ->> 'return_fee', '')::bigint, 0) into v_fee from public.mall_builder_stores s where s.id = o.store_id;
  end if;
  if mall_builder_private.is_bank_paid(o) then
    perform mall_builder_private.save_refund_account(o, p_bank, true);
  end if;
  perform public.mall_builder_change_order_status(p_order_id, 'return_requested', left(coalesce(p_memo, ''), 200), '', '');
  update public.mall_builder_orders set return_reason = p_reason, return_memo = left(btrim(coalesce(p_memo, '')), 300),
         return_step = 'requested', return_fee = least(greatest(v_fee, 0), o.total), updated_at = now()
   where id = p_order_id;
  return 'return_requested';
end;
$$;

-- 환불 계좌 저장(유저 본인 주문·무통장만). p_required면 빈 값 오류
create or replace function mall_builder_private.save_refund_account(o public.mall_builder_orders, p_bank jsonb, p_required boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_name text := btrim(coalesce(p_bank ->> 'bank_name', '')); v_acc text := regexp_replace(coalesce(p_bank ->> 'bank_account', ''), '\s', '', 'g');
        v_holder text := btrim(coalesce(p_bank ->> 'bank_holder', ''));
begin
  if v_name = '' and v_acc = '' and v_holder = '' then
    if p_required then raise exception '무통장 결제 주문은 환불받을 계좌(은행·계좌번호·예금주)를 넣어 주세요.'; end if;
    return;
  end if;
  if v_name = '' or v_holder = '' or v_acc !~ '^[0-9-]{6,30}$' then raise exception '환불 계좌를 확인해 주세요(계좌번호는 숫자·- 6~30자).'; end if;
  insert into public.mall_builder_refund_accounts (order_id, store_id, user_id, bank_name, bank_account, bank_holder)
  values (o.id, o.store_id, o.user_id, left(v_name, 20), v_acc, left(v_holder, 30))
  on conflict (order_id) do update set bank_name = excluded.bank_name, bank_account = excluded.bank_account, bank_holder = excluded.bank_holder, updated_at = now();
end;
$$;
revoke all on function mall_builder_private.save_refund_account(public.mall_builder_orders, jsonb, boolean) from public, anon, authenticated;

-- 유저: 환불 계좌 넣기·고치기(무통장 주문이 취소 요청·반품 요청·환불 대기일 때)
create or replace function public.mall_builder_set_refund_account(p_order_id uuid, p_bank jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.mall_builder_orders%rowtype;
begin
  select * into o from public.mall_builder_orders where id = p_order_id;
  if not found or o.user_id is distinct from auth.uid() then raise exception '주문을 찾을 수 없습니다.'; end if;
  if not mall_builder_private.is_bank_paid(o) then raise exception '카드·외상 주문은 환불 계좌가 필요 없습니다.'; end if;
  if not (o.status in ('cancel_requested', 'return_requested') or o.refund_status = 'pending') then raise exception '지금은 환불 계좌를 넣을 수 없는 주문입니다.'; end if;
  perform mall_builder_private.save_refund_account(o, p_bank, true);
end;
$$;

-- ── 운영사: 회수 단계(회수 중 = 회수 택배사·송장, 회수 완료) ──
create or replace function public.mall_builder_return_step(p_order_id uuid, p_step text, p_courier text default '', p_tracking text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare o public.mall_builder_orders%rowtype;
begin
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found or not public.mall_builder_is_store_staff(o.store_id) then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  if o.status <> 'return_requested' then raise exception '반품 요청 주문만 회수 단계를 바꿀 수 있습니다.'; end if;
  if p_step = 'collecting' then
    if char_length(btrim(coalesce(p_courier, ''))) not between 1 and 30 or char_length(btrim(coalesce(p_tracking, ''))) not between 1 and 40 then
      raise exception '회수 택배사와 송장 번호를 넣어 주세요.';
    end if;
    update public.mall_builder_orders set return_step = 'collecting', return_courier = btrim(p_courier), return_tracking = btrim(p_tracking), updated_at = now() where id = o.id;
  elsif p_step = 'collected' then
    update public.mall_builder_orders set return_step = 'collected', updated_at = now() where id = o.id;
  else
    raise exception '회수 단계가 올바르지 않습니다.';
  end if;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (o.id, o.status, o.status, auth.uid(), 'staff', case when p_step = 'collecting' then '회수 중 · ' || btrim(p_courier) || ' ' || btrim(p_tracking) else '회수 완료(입고 확인)' end);
  return p_step;
end;
$$;

-- ── 운영사: 반품 승인(반품비 차감) — 카드는 (결제 − 반품비)만 부분 환불, 외상은 반품비만큼 다시 청구, 무통장은 환불 대기 ──
create or replace function public.mall_builder_approve_return(p_order_id uuid, p_fee bigint, p_note text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare o public.mall_builder_orders%rowtype; v_fee bigint; v_left bigint; v_done bigint; v_bal bigint;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  perform set_config('lock_timeout', '1000', true);
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found or not public.mall_builder_is_store_staff(o.store_id) then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  if o.status <> 'return_requested' then raise exception '반품 요청 주문만 승인할 수 있습니다.'; end if;
  v_fee := coalesce(p_fee, 0);
  if v_fee < 0 or v_fee > o.total then raise exception '반품비는 0원 이상, 결제 금액(%원) 이하로 넣어 주세요.', o.total; end if;
  update public.mall_builder_orders set return_fee = v_fee where id = o.id;

  if o.is_card then
    if exists (select 1 from public.mall_builder_card_payments cp where cp.order_id = o.id and cp.status in ('requested', 'unknown')) then
      raise exception '결제 확인 중인 카드 주문입니다. 「결제 다시 확인」을 먼저 해 주세요.';
    end if;
    select cp.amount - cp.canceled_amount, cp.canceled_amount into v_left, v_done
      from public.mall_builder_card_payments cp where cp.order_id = o.id and cp.status in ('done', 'partial_canceled');
    perform set_config('mall_builder.card_refund', 'on', true);
    perform public.mall_builder_change_order_status(o.id, 'returned', p_note, '', '');
    perform mall_builder_private.card_refund(o.id, greatest(coalesce(v_left, 0) - v_fee, 0), coalesce(nullif(p_note, ''), '반품'), 'return-' || o.id || '-' || coalesce(v_done, 0));
    perform set_config('mall_builder.card_refund', '', true);
    update public.mall_builder_orders set refund_status = 'done', refund_amount = greatest(coalesce(v_left, 0) - v_fee, 0), refunded_at = now() where id = o.id;
  else
    perform public.mall_builder_change_order_status(o.id, 'returned', p_note, '', '');
    if o.is_credit and o.customer_id is not null and v_fee > 0 then
      -- 상태 함수가 외상 전액을 되돌렸으므로 반품비만큼 다시 청구
      perform 1 from public.mall_builder_store_customers c where c.id = o.customer_id for update;
      select coalesce(sum(l.amount), 0) into v_bal from public.mall_builder_credit_ledger l where l.customer_id = o.customer_id;
      insert into public.mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note, actor_id)
      values (o.store_id, o.customer_id, o.id, 'adjust', v_fee, v_bal + v_fee, '주문 ' || o.order_no || ' 반품비', auth.uid());
    end if;
  end if;
  return 'returned';
end;
$$;

-- 무통장 주문이 결제 뒤 취소·반품되면 환불 대기로(금액 = 결제 − 반품비). 카드·외상·입금 전 취소는 해당 없음
create or replace function public.mall_builder_orders_refund_pending()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is not distinct from old.status or new.status not in ('cancelled', 'returned') then return new; end if;
  if new.is_card or new.is_credit or old.status = 'pending_payment' or new.refund_status <> 'none' then return new; end if;
  new.refund_status := 'pending';
  new.refund_amount := greatest(new.total - coalesce(new.return_fee, 0), 0);
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_refund_pending on public.mall_builder_orders;
create trigger mall_builder_orders_refund_pending before update of status on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_refund_pending();

-- ── 운영사: 환불 완료(이체 뒤) — 계좌 정보는 지운다(금액·일시는 남김) ──
create or replace function public.mall_builder_refund_done(p_order_id uuid, p_note text default '')
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare o public.mall_builder_orders%rowtype; v_src uuid; v_at timestamptz := now();
begin
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found then raise exception '주문을 찾을 수 없습니다.'; end if;
  select s.source_store_id into v_src from public.mall_builder_stores s where s.id = o.store_id;
  -- 그 몰 직원, 또는 분양몰 주문이면 본사(돈을 받은 쪽) 직원
  if not (public.mall_builder_is_store_staff(o.store_id) or (v_src is not null and public.mall_builder_is_store_staff(v_src))) then
    raise exception '이 주문을 바꿀 권한이 없습니다.';
  end if;
  if o.refund_status <> 'pending' then raise exception '환불 대기 주문이 아닙니다.'; end if;
  update public.mall_builder_orders set refund_status = 'done', refunded_at = v_at, updated_at = now() where id = o.id;
  delete from public.mall_builder_refund_accounts where order_id = o.id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (o.id, o.status, o.status, auth.uid(), 'staff', '환불 완료 ' || to_char(o.refund_amount, 'FM999,999,999,990') || '원' || coalesce(nullif(' · ' || btrim(p_note), ' · '), ''));
  return v_at;
end;
$$;

revoke all on function public.mall_builder_request_return(uuid, text, text, jsonb) from public, anon;
revoke all on function public.mall_builder_set_refund_account(uuid, jsonb) from public, anon;
revoke all on function public.mall_builder_return_step(uuid, text, text, text) from public, anon;
revoke all on function public.mall_builder_approve_return(uuid, bigint, text) from public, anon;
revoke all on function public.mall_builder_refund_done(uuid, text) from public, anon;
grant execute on function public.mall_builder_request_return(uuid, text, text, jsonb) to authenticated;
grant execute on function public.mall_builder_set_refund_account(uuid, jsonb) to authenticated;
grant execute on function public.mall_builder_return_step(uuid, text, text, text) to authenticated;
grant execute on function public.mall_builder_approve_return(uuid, bigint, text) to authenticated;
grant execute on function public.mall_builder_refund_done(uuid, text) to authenticated;
