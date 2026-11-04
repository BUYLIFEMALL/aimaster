-- AI 쇼핑몰 빌더 — 입금 기한 자동 취소(플랜 docs/PLAN_20261104_DEPOSIT_AUTO_CANCEL.md)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(drop·revoke·delete 없음 — 확인 창 방지)
-- 실행: 몰 운영자 본인 cron-job.org가 10분마다 몰 전용 실행 주소(/api/cron/deposit-expire)를 부른다.
--       머리글 토큰은 몰마다 따로 만들고, DB에는 SHA-256 해시만 둔다(사이트 비밀값은 쓰지 않음).
-- 앱에 서비스 키가 없으므로 비밀 칸(cron-job.org 키·토큰 해시)은 읽기 규칙이 하나도 없는 표에 두고, 아래 security definer 함수로만 다룬다.

-- ── 0024a ── 표·칸·규칙 (추가만)
alter table public.mall_builder_orders add column if not exists pay_deadline_at timestamptz;
create index if not exists mall_builder_orders_pay_deadline on public.mall_builder_orders (store_id, pay_deadline_at)
  where status = 'pending_payment' and pay_deadline_at is not null;

create table if not exists public.mall_builder_store_schedulers (
  store_id uuid primary key references public.mall_builder_stores (id) on delete cascade,
  deposit_hours integer check (deposit_hours between 1 and 168), -- 비우면 자동 취소 안 함
  job_id bigint,                                                 -- 운영자 cron-job.org 작업 번호(연결 전 null)
  paused boolean not null default false,
  last_run_at timestamptz,
  last_cancelled integer not null default 0,
  total_cancelled integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.mall_builder_store_schedulers enable row level security;
-- 보기만: 그 몰 운영자. 쓰기는 함수로만
create policy "mall_builder_store_schedulers_read" on public.mall_builder_store_schedulers
  for select using (public.mall_builder_is_store_staff(store_id));

create table if not exists public.mall_builder_store_scheduler_secrets (
  store_id uuid primary key references public.mall_builder_stores (id) on delete cascade,
  cronjob_api_key text not null default '',
  run_token_hash text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.mall_builder_store_scheduler_secrets enable row level security;
-- 규칙 없음 = 손님·운영자 누구도 표를 직접 읽거나 쓰지 못한다
create index if not exists mall_builder_store_scheduler_secrets_token on public.mall_builder_store_scheduler_secrets (run_token_hash)
  where run_token_hash <> '';

-- ── 0024b ── 함수 (함수 정의만 바꾼다. 지금 지워지는 데이터는 없다)

-- 주문이 들어올 때 입금 기한을 적는다 — 자동 취소가 실제로 돌고 있을 때만(작업 연결됨·일시정지 아님)
create or replace function public.mall_builder_orders_set_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_hours integer;
begin
  if new.status = 'pending_payment' and new.pay_deadline_at is null then
    select s.deposit_hours into v_hours from public.mall_builder_store_schedulers s
      where s.store_id = new.store_id and s.job_id is not null and not s.paused;
    if v_hours is not null then
      new.pay_deadline_at := now() + make_interval(hours => v_hours);
    end if;
  end if;
  return new;
end;
$$;
create or replace trigger mall_builder_orders_set_deadline before insert on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_set_deadline();

-- 운영자: 입금 기한(시간)·cron-job.org 키 저장. p_api_key가 null이면 키는 그대로, ''이면 키를 비운다
create or replace function public.mall_builder_scheduler_save(p_store_id uuid, p_hours integer, p_api_key text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if p_hours is not null and p_hours not between 1 and 168 then raise exception '입금 기한은 1~168시간으로 입력해 주세요.'; end if;
  if p_api_key is not null and char_length(p_api_key) > 200 then raise exception 'cron-job.org API 키가 너무 깁니다.'; end if;
  insert into public.mall_builder_store_schedulers (store_id, deposit_hours) values (p_store_id, p_hours)
    on conflict (store_id) do update set deposit_hours = excluded.deposit_hours, updated_at = now();
  insert into public.mall_builder_store_scheduler_secrets (store_id, cronjob_api_key) values (p_store_id, coalesce(btrim(p_api_key), ''))
    on conflict (store_id) do update set
      cronjob_api_key = case when p_api_key is null then public.mall_builder_store_scheduler_secrets.cronjob_api_key else btrim(p_api_key) end,
      updated_at = now();
end;
$$;

-- 운영자: 자기 몰 cron-job.org 키 읽기(서버 동작에서 cron-job.org를 부를 때만)
create or replace function public.mall_builder_scheduler_api_key(p_store_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_key text;
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  select s.cronjob_api_key into v_key from public.mall_builder_store_scheduler_secrets s where s.store_id = p_store_id;
  return coalesce(v_key, '');
end;
$$;

-- 운영자: cron-job.org 작업을 만든·멈춘 결과 기록(토큰은 해시만). p_token_hash가 null이면 토큰 해시는 그대로
create or replace function public.mall_builder_scheduler_link(p_store_id uuid, p_job_id bigint, p_paused boolean, p_token_hash text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if p_token_hash is not null and p_token_hash !~ '^[0-9a-f]{64}$' then raise exception '토큰 형식이 올바르지 않습니다.'; end if;
  insert into public.mall_builder_store_schedulers (store_id, job_id, paused) values (p_store_id, p_job_id, coalesce(p_paused, false))
    on conflict (store_id) do update set job_id = excluded.job_id, paused = excluded.paused, updated_at = now();
  if p_token_hash is not null then
    insert into public.mall_builder_store_scheduler_secrets (store_id, run_token_hash) values (p_store_id, p_token_hash)
      on conflict (store_id) do update set run_token_hash = excluded.run_token_hash, updated_at = now();
  end if;
end;
$$;

-- 실행 주소(로그인 없이 cron-job.org가 부름): 토큰 해시로 몰 하나를 찾아 그 몰의 기한 지난 입금 대기 주문만 취소
-- 취소·재고 되돌림은 mall_builder_change_order_status(0021c)와 같은 방식. 외상 주문은 결제 완료로 시작하므로 대상이 아니다
create or replace function public.mall_builder_expire_deposits(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_store uuid;
  v_paused boolean;
  v_order record;
  v_count integer := 0;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token'; end if;
  select s.store_id into v_store from public.mall_builder_store_scheduler_secrets s where s.run_token_hash = p_token_hash;
  if v_store is null then raise exception 'invalid_token'; end if;
  select coalesce(sc.paused, false) into v_paused from public.mall_builder_store_schedulers sc where sc.store_id = v_store;
  if v_paused then return jsonb_build_object('paused', true, 'cancelled', 0); end if;

  for v_order in
    select o.id, o.status from public.mall_builder_orders o
     where o.store_id = v_store and o.status = 'pending_payment' and o.pay_deadline_at is not null and o.pay_deadline_at < now()
     order by o.pay_deadline_at
     limit 200
     for update skip locked
  loop
    update public.mall_builder_product_variants v set stock = v.stock + (i.qty - i.cancelled_qty)
      from public.mall_builder_order_items i
      where i.order_id = v_order.id and i.stock_deducted and i.variant_id is not null and v.id = i.variant_id;
    update public.mall_builder_products p set stock = p.stock + (i.qty - i.cancelled_qty)
      from public.mall_builder_order_items i
      where i.order_id = v_order.id and i.stock_deducted and i.variant_id is null and p.id = i.product_id;
    update public.mall_builder_order_items i set stock_deducted = false where i.order_id = v_order.id and i.stock_deducted;
    update public.mall_builder_orders o set status = 'cancelled', updated_at = now() where o.id = v_order.id;
    insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
    values (v_order.id, v_order.status, 'cancelled', null, 'system', '입금 기한 초과 자동 취소');
    v_count := v_count + 1;
  end loop;

  update public.mall_builder_store_schedulers sc set
    last_run_at = now(), last_cancelled = v_count, total_cancelled = sc.total_cancelled + v_count
  where sc.store_id = v_store;
  return jsonb_build_object('paused', false, 'cancelled', v_count);
end;
$$;
