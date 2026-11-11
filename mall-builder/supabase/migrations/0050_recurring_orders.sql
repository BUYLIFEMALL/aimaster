-- D30 정기 주문(B2B) — 거래처가 매주·○주마다·매달 같은 품목을 자동 주문(외상·무통장만, 카드 자동결제는 다음).
-- 2026-11-11 주인님 결정 「추천안 4가지 그대로」: 가격은 주문일의 그때 가격, 자동 실행은 몰 운영자 본인 cron-job.org(기존 실행 주소에 한 단계 추가).
-- 주문은 기존 주문 함수 mall_builder_place_order_v2를 그대로 불러 만든다(가격·재고·외상 한도·폐쇄몰 규칙이 손님 주문과 똑같다).
--   그 거래처 이름으로(요청 범위 안에서만 auth.uid를 그 손님으로) 장바구니에 정기 품목을 담아 부르고, 끝나면 원래 장바구니를 되돌린다.
--   실패하면 저장점까지 통째로 되돌아가 장바구니도 원래대로다.
-- 같은 회차 두 번 주문 금지: 회차 표 (정기 주문, 주문일) 고유. 결과가 실패여도 그날은 다시 시도하지 않고 다음 주문일로 넘긴다.

-- 1. 주문 함수: 정기 실행 중에는 「화면에서 본 금액」 확인만 건너뛴다(금액은 서버가 계산). 한 곳만 바꾼다
do $$
declare
  d text;
  sig constant text := 'public.mall_builder_place_order_v2(uuid,uuid,text,text,bigint,text,uuid,bigint)';
  pat constant text := E'  if p_expected_total is distinct from v_total then\n';
  rep constant text := E'  if p_expected_total is distinct from v_total and coalesce(current_setting(''mall_builder.recurring_run'', true), '''') <> ''on'' then\n';
  cnt integer;
begin
  d := pg_get_functiondef(sig::regprocedure);
  if position('mall_builder.recurring_run' in d) > 0 then
    raise notice '이미 적용돼 있습니다 — 건너뜀';
    return;
  end if;
  cnt := (length(d) - length(replace(d, pat, ''))) / length(pat);
  if cnt <> 1 then raise exception '바꿀 자리가 %번 있습니다(1번이어야 함) — 멈춤', cnt; end if;
  execute replace(d, pat, rep);
end $$;

-- 2. 표
create table if not exists public.mall_builder_recurring_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  customer_id uuid not null references public.mall_builder_store_customers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  items jsonb not null, -- [{product_id, variant_id, qty, name, option}]
  kind text not null check (kind in ('weekly', 'monthly')),
  weekday integer check (weekday between 0 and 6),
  every_weeks integer not null default 1 check (every_weeks between 1 and 4),
  month_day integer check (month_day between 1 and 31),
  next_date date not null,
  pay_method text not null check (pay_method in ('bank', 'credit')),
  address_id uuid references public.mall_builder_customer_addresses (id) on delete set null,
  depositor text not null default '',
  memo text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  last_run_date date,
  last_status text,
  last_reason text,
  last_order_id uuid references public.mall_builder_orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'weekly' and weekday is not null) or (kind = 'monthly' and month_day is not null))
);
create index if not exists mall_builder_recurring_orders_due on public.mall_builder_recurring_orders (store_id, status, next_date);
create index if not exists mall_builder_recurring_orders_user on public.mall_builder_recurring_orders (user_id);

create table if not exists public.mall_builder_recurring_runs (
  id uuid primary key default gen_random_uuid(),
  recurring_id uuid not null references public.mall_builder_recurring_orders (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  run_date date not null,
  status text not null check (status in ('ordered', 'failed')),
  order_id uuid references public.mall_builder_orders (id) on delete set null,
  total bigint,
  reason text,
  created_at timestamptz not null default now(),
  unique (recurring_id, run_date)
);

create table if not exists public.mall_builder_recurring_settings (
  store_id uuid primary key references public.mall_builder_stores (id) on delete cascade,
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.mall_builder_recurring_orders enable row level security;
alter table public.mall_builder_recurring_runs enable row level security;
alter table public.mall_builder_recurring_settings enable row level security;
-- 읽기: 손님 본인 + 「주문」 권한 직원. 쓰기는 아래 함수로만
drop policy if exists mall_builder_recurring_orders_read on public.mall_builder_recurring_orders;
create policy mall_builder_recurring_orders_read on public.mall_builder_recurring_orders for select
  using (user_id = auth.uid() or public.mall_builder_staff_can(store_id, 'orders'));
drop policy if exists mall_builder_recurring_runs_read on public.mall_builder_recurring_runs;
create policy mall_builder_recurring_runs_read on public.mall_builder_recurring_runs for select
  using (public.mall_builder_staff_can(store_id, 'orders')
         or exists (select 1 from public.mall_builder_recurring_orders r where r.id = recurring_id and r.user_id = auth.uid()));
drop policy if exists mall_builder_recurring_settings_read on public.mall_builder_recurring_settings;
create policy mall_builder_recurring_settings_read on public.mall_builder_recurring_settings for select
  using (public.mall_builder_is_store_staff(store_id));

-- 3. 날짜 계산(src/lib/recurring.ts와 같은 규칙)
create or replace function mall_builder_private.recurring_first(p_kind text, p_weekday integer, p_month_day integer, p_start date)
returns date language plpgsql immutable set search_path = '' as $$
declare v_last integer; v_day integer; v_next date;
begin
  if p_kind = 'weekly' then
    return p_start + ((p_weekday - extract(dow from p_start)::integer + 7) % 7);
  end if;
  v_last := extract(day from (date_trunc('month', p_start) + interval '1 month - 1 day'))::integer;
  v_day := least(p_month_day, v_last);
  if extract(day from p_start)::integer <= v_day then
    return date_trunc('month', p_start)::date + (v_day - 1);
  end if;
  v_next := (date_trunc('month', p_start) + interval '1 month')::date;
  v_last := extract(day from (v_next + interval '1 month - 1 day'))::integer;
  return v_next + (least(p_month_day, v_last) - 1);
end $$;

create or replace function mall_builder_private.recurring_next(p_kind text, p_every integer, p_month_day integer, p_from date)
returns date language plpgsql immutable set search_path = '' as $$
declare v_next date; v_last integer;
begin
  if p_kind = 'weekly' then return p_from + 7 * p_every; end if;
  v_next := (date_trunc('month', p_from) + interval '1 month')::date;
  v_last := extract(day from (v_next + interval '1 month - 1 day'))::integer;
  return v_next + (least(p_month_day, v_last) - 1);
end $$;

-- 4. 손님: 지난 주문으로 정기 주문 만들기
create or replace function public.mall_builder_recurring_create(
  p_store_id uuid, p_order_id uuid, p_kind text, p_weekday integer, p_every_weeks integer, p_month_day integer,
  p_start date, p_pay_method text, p_address_id uuid, p_depositor text, p_memo text)
returns uuid language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_customer public.mall_builder_store_customers%rowtype;
  v_items jsonb;
  v_id uuid;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_customer from public.mall_builder_store_customers c where c.store_id = p_store_id and c.user_id = v_uid;
  if not found then raise exception '이 몰에 가입한 손님만 정기 주문을 만들 수 있습니다.'; end if;
  if not exists (select 1 from public.mall_builder_orders o where o.id = p_order_id and o.store_id = p_store_id and o.customer_id = v_customer.id) then
    raise exception '내 주문에서만 정기 주문을 만들 수 있습니다.';
  end if;
  if p_kind not in ('weekly', 'monthly') then raise exception '주기를 골라 주세요.'; end if;
  if p_kind = 'weekly' and (p_weekday is null or p_weekday not between 0 and 6 or coalesce(p_every_weeks, 0) not between 1 and 4) then raise exception '요일·주기를 다시 골라 주세요.'; end if;
  if p_kind = 'monthly' and coalesce(p_month_day, 0) not between 1 and 31 then raise exception '날짜는 1~31일로 골라 주세요.'; end if;
  if p_start is null or p_start < v_today or p_start > v_today + 90 then raise exception '시작일은 오늘부터 90일 안으로 골라 주세요.'; end if;
  if p_pay_method not in ('bank', 'credit') then raise exception '정기 주문은 무통장 입금이나 외상으로만 됩니다.'; end if;
  if p_pay_method = 'credit' and coalesce(v_customer.credit_limit, 0) <= 0 then raise exception '외상 한도가 없습니다. 운영자에게 문의해 주세요.'; end if;
  if not exists (select 1 from public.mall_builder_customer_addresses a where a.id = p_address_id and a.customer_id = v_customer.id) then raise exception '배송지를 골라 주세요.'; end if;
  if char_length(btrim(coalesce(p_depositor, ''))) not between 1 and 20 then raise exception '입금자명을 1~20자로 입력해 주세요.'; end if;
  if (select count(*) from public.mall_builder_recurring_orders r where r.customer_id = v_customer.id and r.status <> 'cancelled') >= 20 then
    raise exception '정기 주문은 20개까지 만들 수 있습니다.';
  end if;
  -- 품목: 그 주문에서 취소 안 된 수량, 공동구매 품목 제외, 같은 상품·옵션은 합침
  select jsonb_agg(jsonb_build_object('product_id', x.product_id, 'variant_id', x.variant_id, 'qty', x.qty, 'name', x.name, 'option', x.opt) order by x.name)
    into v_items
    from (select i.product_id, i.variant_id, sum(i.qty - coalesce(i.cancelled_qty, 0))::integer as qty, min(i.name_snapshot) as name, min(coalesce(i.option_snapshot, '')) as opt
            from public.mall_builder_order_items i
           where i.order_id = p_order_id and i.product_id is not null and i.group_buy_id is null
           group by i.product_id, i.variant_id) x
   where x.qty > 0;
  if v_items is null then raise exception '정기 주문으로 만들 수 있는 품목이 없습니다(공동구매·취소 품목 제외).'; end if;
  if jsonb_array_length(v_items) > 50 then raise exception '품목은 50개까지입니다.'; end if;
  insert into public.mall_builder_recurring_orders (store_id, customer_id, user_id, items, kind, weekday, every_weeks, month_day, next_date, pay_method, address_id, depositor, memo)
  values (p_store_id, v_customer.id, v_uid, v_items, p_kind,
          case when p_kind = 'weekly' then p_weekday end, case when p_kind = 'weekly' then p_every_weeks else 1 end, case when p_kind = 'monthly' then p_month_day end,
          mall_builder_private.recurring_first(p_kind, p_weekday, p_month_day, p_start), p_pay_method, p_address_id, btrim(p_depositor), left(coalesce(p_memo, ''), 200))
  returning id into v_id;
  return v_id;
end $$;

-- 5. 손님 본인 또는 「주문」 권한 직원: 일시정지·다시 시작·이번 회차 건너뛰기·해지·수량 바꾸기
create or replace function public.mall_builder_recurring_change(p_id uuid, p_action text, p_qtys jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.mall_builder_recurring_orders%rowtype;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_items jsonb := '[]'::jsonb;
  v_q integer;
  i integer;
begin
  select * into r from public.mall_builder_recurring_orders where id = p_id for update;
  if not found or not (r.user_id = auth.uid() or public.mall_builder_staff_can(r.store_id, 'orders')) then raise exception '정기 주문을 찾을 수 없습니다.'; end if;
  if r.status = 'cancelled' then raise exception '해지한 정기 주문입니다.'; end if;
  if p_action = 'pause' then
    update public.mall_builder_recurring_orders set status = 'paused', updated_at = now() where id = p_id;
  elsif p_action = 'resume' then
    while r.next_date < v_today loop r.next_date := mall_builder_private.recurring_next(r.kind, r.every_weeks, r.month_day, r.next_date); end loop;
    update public.mall_builder_recurring_orders set status = 'active', next_date = r.next_date, updated_at = now() where id = p_id;
  elsif p_action = 'skip' then
    r.next_date := mall_builder_private.recurring_next(r.kind, r.every_weeks, r.month_day, r.next_date);
    update public.mall_builder_recurring_orders set next_date = r.next_date, updated_at = now() where id = p_id;
  elsif p_action = 'cancel' then
    update public.mall_builder_recurring_orders set status = 'cancelled', updated_at = now() where id = p_id;
  elsif p_action = 'qty' then
    if jsonb_typeof(p_qtys) <> 'array' or jsonb_array_length(p_qtys) <> jsonb_array_length(r.items) then raise exception '수량을 다시 입력해 주세요.'; end if;
    for i in 0 .. jsonb_array_length(r.items) - 1 loop
      v_q := (p_qtys ->> i)::integer;
      if v_q is null or v_q < 0 or v_q > 999 then raise exception '수량은 0~999로 입력해 주세요(0이면 그 품목을 뺍니다).'; end if;
      if v_q > 0 then v_items := v_items || jsonb_set(r.items -> i, '{qty}', to_jsonb(v_q)); end if;
    end loop;
    if jsonb_array_length(v_items) = 0 then raise exception '품목이 하나는 있어야 합니다. 그만 받으려면 「해지」를 눌러 주세요.'; end if;
    update public.mall_builder_recurring_orders set items = v_items, updated_at = now() where id = p_id;
  else
    raise exception '알 수 없는 요청입니다.';
  end if;
  return (select jsonb_build_object('status', o.status, 'next_date', o.next_date) from public.mall_builder_recurring_orders o where o.id = p_id);
end $$;

-- 6. 운영자: 몰 전체 정기 주문 일시정지(자동 실행 지침 「전체 일시정지 단추 하나」)
create or replace function public.mall_builder_recurring_pause_all(p_store_id uuid, p_paused boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.mall_builder_staff_can(p_store_id, 'orders') then raise exception '「주문」 권한이 있는 직원만 바꿀 수 있습니다.'; end if;
  insert into public.mall_builder_recurring_settings (store_id, paused, updated_at) values (p_store_id, coalesce(p_paused, false), now())
  on conflict (store_id) do update set paused = excluded.paused, updated_at = now();
  return coalesce(p_paused, false);
end $$;

-- 7. 예약 실행(몰 토큰): 오늘(한국) 주문일이 된 정기 주문을 만든다. 한국 시각 8시 이후 첫 실행 때, 한 번에 30개까지
create or replace function public.mall_builder_recurring_run(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_store uuid;
  v_paused boolean;
  v_now timestamp := now() at time zone 'Asia/Seoul';
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_sms boolean;
  v_name text;
  r public.mall_builder_recurring_orders%rowtype;
  v_run uuid;
  v_stash jsonb;
  v_oid uuid;
  v_ono text;
  v_total bigint;
  v_reason text;
  v_phone text;
  v_ok integer := 0;
  v_fail integer := 0;
  v_orig_sub text := coalesce(current_setting('request.jwt.claim.sub', true), '');
  v_orig_claims text := coalesce(current_setting('request.jwt.claims', true), '');
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token'; end if;
  select x.store_id into v_store from public.mall_builder_store_scheduler_secrets x where x.run_token_hash = p_token_hash;
  if v_store is null then raise exception 'invalid_token'; end if;
  select s.paused into v_paused from public.mall_builder_store_schedulers s where s.store_id = v_store;
  if coalesce(v_paused, true) then return jsonb_build_object('paused', true); end if;
  if coalesce((select st.paused from public.mall_builder_recurring_settings st where st.store_id = v_store), false) then return jsonb_build_object('recurring_paused', true); end if;
  if extract(hour from v_now) < 8 then return jsonb_build_object('waiting_until', '08:00'); end if;

  select x.solapi_api_key <> '' and x.solapi_api_secret <> '' and ns.sender_phone <> ''
    into v_sms
    from public.mall_builder_store_scheduler_secrets x join public.mall_builder_store_notify_settings ns on ns.store_id = x.store_id
   where x.store_id = v_store;
  select st.name into v_name from public.mall_builder_stores st where st.id = v_store;

  for r in select * from public.mall_builder_recurring_orders o
            where o.store_id = v_store and o.status = 'active' and o.next_date <= v_today
            order by o.next_date, o.created_at limit 30 for update skip locked loop
    v_oid := null; v_total := null; v_reason := null;
    insert into public.mall_builder_recurring_runs (recurring_id, store_id, run_date, status, reason)
    values (r.id, v_store, r.next_date, 'failed', '처리 중')
    on conflict (recurring_id, run_date) do nothing
    returning id into v_run;
    if v_run is not null then
      begin
        -- 이 요청 안에서만 그 거래처로: 주문 함수가 auth.uid()·장바구니를 그 손님 것으로 읽는다
        perform set_config('request.jwt.claim.sub', r.user_id::text, true);
        perform set_config('request.jwt.claims', jsonb_build_object('sub', r.user_id, 'role', 'authenticated')::text, true);
        perform set_config('mall_builder.recurring_run', 'on', true);
        select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_stash from public.mall_builder_cart_items c where c.store_id = v_store and c.user_id = r.user_id;
        delete from public.mall_builder_cart_items c where c.store_id = v_store and c.user_id = r.user_id;
        insert into public.mall_builder_cart_items (store_id, user_id, product_id, variant_id, qty)
        select v_store, r.user_id, (e ->> 'product_id')::uuid, nullif(e ->> 'variant_id', '')::uuid, sum((e ->> 'qty')::integer)
          from jsonb_array_elements(r.items) e group by 3, 4;
        select o.order_id, o.order_no into v_oid, v_ono
          from public.mall_builder_place_order_v2(v_store, r.address_id, r.depositor, r.memo, -1, r.pay_method) o;
        select ord.total into v_total from public.mall_builder_orders ord where ord.id = v_oid;
        -- 원래 장바구니 되돌리기
        delete from public.mall_builder_cart_items c where c.store_id = v_store and c.user_id = r.user_id;
        insert into public.mall_builder_cart_items select * from jsonb_populate_recordset(null::public.mall_builder_cart_items, v_stash);
      exception when others then
        v_oid := null;
        v_reason := left(sqlerrm, 200);
      end;
      perform set_config('request.jwt.claim.sub', v_orig_sub, true);
      perform set_config('request.jwt.claims', v_orig_claims, true);
      perform set_config('mall_builder.recurring_run', '', true);
      if v_oid is not null then
        update public.mall_builder_recurring_runs set status = 'ordered', order_id = v_oid, total = v_total, reason = null where id = v_run;
        v_ok := v_ok + 1;
      else
        update public.mall_builder_recurring_runs set status = 'failed', reason = v_reason where id = v_run;
        v_fail := v_fail + 1;
        -- 실패 문자(손님) — 성공은 주문 알림(0025)이 그대로 나간다
        if coalesce(v_sms, false) then
          select public.mall_builder_digits(c.phone) into v_phone from public.mall_builder_store_customers c where c.id = r.customer_id;
          if coalesce(v_phone, '') <> '' then
            insert into public.mall_builder_notifications (store_id, kind, channel, to_phone, body)
            values (v_store, 'customer_recurring_failed', 'sms', v_phone,
              '[' || coalesce(v_name, '쇼핑몰') || '] 오늘 정기 주문을 만들지 못했습니다: ' || left(coalesce(v_reason, ''), 60) || ' 필요하면 직접 주문해 주세요.');
          end if;
        end if;
      end if;
    end if;
    update public.mall_builder_recurring_orders
       set next_date = mall_builder_private.recurring_next(r.kind, r.every_weeks, r.month_day, r.next_date),
           last_run_date = r.next_date,
           last_status = case when v_run is null then last_status when v_oid is not null then 'ordered' else 'failed' end,
           last_reason = case when v_run is null then last_reason else v_reason end,
           last_order_id = case when v_oid is not null then v_oid else last_order_id end,
           updated_at = now()
     where id = r.id;
  end loop;
  return jsonb_build_object('paused', false, 'ordered', v_ok, 'failed', v_fail);
end $$;

revoke all on function public.mall_builder_recurring_run(text) from public;
grant execute on function public.mall_builder_recurring_run(text) to anon, authenticated;
