-- AI 쇼핑몰 빌더 — 주문 알림 1단계: 문자(플랜 docs/PLAN_20261104_ORDER_NOTIFY.md)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(drop·revoke·delete 없음 — 확인 창 방지)
-- 방식: 주문 처리 기록(mall_builder_order_events)이 생길 때 DB 트리거가 「알림 대기 줄」에 문구를 적고,
--       D8과 같은 몰 운영자 cron-job.org 작업(실행 주소 /api/cron/deposit-expire)이 몰 전용 토큰으로 꺼내 솔라피로 보낸다.
-- 솔라피 키·시크릿은 D8 비밀 표(규칙 0개)에 두고, 토큰 확인을 통과한 발송 함수와 그 몰 운영자 함수만 읽는다.
-- 손님 요청(주문 넣기)에서는 키를 읽는 길이 없다.

-- ── 0025a ── 표·칸·규칙 (추가만)
alter table public.mall_builder_store_scheduler_secrets add column if not exists solapi_api_key text not null default '';
alter table public.mall_builder_store_scheduler_secrets add column if not exists solapi_api_secret text not null default '';

create table if not exists public.mall_builder_store_notify_settings (
  store_id uuid primary key references public.mall_builder_stores (id) on delete cascade,
  sender_phone text not null default '',  -- 솔라피에 등록한 발신번호(숫자만)
  staff_phone text not null default '',   -- 운영자가 알림 받을 핸드폰(숫자만)
  kinds text[] not null default '{}',     -- 켠 알림 종류
  updated_at timestamptz not null default now(),
  constraint mall_builder_store_notify_settings_kinds check (
    kinds <@ array['staff_new_order','customer_received','customer_paid','customer_shipped','customer_expired']::text[])
);
alter table public.mall_builder_store_notify_settings enable row level security;
create policy "mall_builder_store_notify_settings_read" on public.mall_builder_store_notify_settings
  for select using (public.mall_builder_is_store_staff(store_id));

create table if not exists public.mall_builder_notifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  order_id uuid references public.mall_builder_orders (id) on delete cascade, -- 시험 문자는 null
  kind text not null,
  channel text not null default 'sms',
  to_phone text not null,
  body text not null,
  -- queued 대기 · sending 보내는 중 · sent 보냄 · failed 실패 · unknown 결과 불확실(다시 보내지 않음) · expired 하루 넘게 못 보내 버림
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','unknown','expired')),
  error text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.mall_builder_notifications enable row level security;
-- 보기만: 그 몰 운영자. 쓰기는 함수로만(손님은 볼 수 없음)
create policy "mall_builder_notifications_read" on public.mall_builder_notifications
  for select using (public.mall_builder_is_store_staff(store_id));
-- 같은 주문·같은 종류는 한 번만(중복 발송 방지)
create unique index if not exists mall_builder_notifications_once on public.mall_builder_notifications (order_id, kind) where order_id is not null;
create index if not exists mall_builder_notifications_queue on public.mall_builder_notifications (store_id, status, created_at);
create index if not exists mall_builder_notifications_order on public.mall_builder_notifications (order_id);

-- ── 0025b ── 함수 (함수 정의만 바꾼다. 지금 지워지는 데이터는 없다)

-- 숫자만 남긴 번호(010-1234-5678 → 01012345678)
create or replace function public.mall_builder_digits(p text)
returns text language sql immutable set search_path = '' as $$ select regexp_replace(coalesce(p, ''), '\D', '', 'g') $$;

-- 운영자: 알림 설정·솔라피 키 저장. 키·시크릿이 null이면 그대로, ''이면 비운다
create or replace function public.mall_builder_notify_save(
  p_store_id uuid, p_sender_phone text, p_staff_phone text, p_kinds text[],
  p_api_key text default null, p_api_secret text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_sender text := public.mall_builder_digits(p_sender_phone); v_staff text := public.mall_builder_digits(p_staff_phone);
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if v_sender <> '' and v_sender !~ '^0\d{8,10}$' then raise exception '발신번호 형식이 올바르지 않습니다.'; end if;
  if v_staff <> '' and v_staff !~ '^01[016789]\d{7,8}$' then raise exception '알림 받을 번호는 핸드폰 번호로 입력해 주세요.'; end if;
  if not (coalesce(p_kinds, '{}') <@ array['staff_new_order','customer_received','customer_paid','customer_shipped','customer_expired']::text[]) then
    raise exception '알 수 없는 알림 종류입니다.';
  end if;
  if char_length(coalesce(p_api_key, '')) > 200 or char_length(coalesce(p_api_secret, '')) > 200 then raise exception '솔라피 키가 너무 깁니다.'; end if;
  insert into public.mall_builder_store_notify_settings (store_id, sender_phone, staff_phone, kinds)
    values (p_store_id, v_sender, v_staff, coalesce(p_kinds, '{}'))
    on conflict (store_id) do update set sender_phone = excluded.sender_phone, staff_phone = excluded.staff_phone, kinds = excluded.kinds, updated_at = now();
  insert into public.mall_builder_store_scheduler_secrets (store_id, solapi_api_key, solapi_api_secret)
    values (p_store_id, coalesce(btrim(p_api_key), ''), coalesce(btrim(p_api_secret), ''))
    on conflict (store_id) do update set
      solapi_api_key = case when p_api_key is null then public.mall_builder_store_scheduler_secrets.solapi_api_key else btrim(p_api_key) end,
      solapi_api_secret = case when p_api_secret is null then public.mall_builder_store_scheduler_secrets.solapi_api_secret else btrim(p_api_secret) end,
      updated_at = now();
end;
$$;

-- 운영자: 자기 몰 솔라피 키 읽기(시험 문자·잔액 조회를 서버 동작에서 할 때만)
create or replace function public.mall_builder_notify_credentials(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  select jsonb_build_object('api_key', x.solapi_api_key, 'api_secret', x.solapi_api_secret,
                            'sender_phone', coalesce(ns.sender_phone, ''), 'staff_phone', coalesce(ns.staff_phone, ''))
    into v
    from public.mall_builder_store_scheduler_secrets x
    left join public.mall_builder_store_notify_settings ns on ns.store_id = x.store_id
   where x.store_id = p_store_id;
  return coalesce(v, jsonb_build_object('api_key', '', 'api_secret', '', 'sender_phone', '', 'staff_phone', ''));
end;
$$;

-- 운영자: 시험 문자 결과 기록(주문 없음)
create or replace function public.mall_builder_notify_log_test(p_store_id uuid, p_to text, p_body text, p_ok boolean, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  insert into public.mall_builder_notifications (store_id, order_id, kind, to_phone, body, status, error, sent_at)
  values (p_store_id, null, 'test', public.mall_builder_digits(p_to), left(coalesce(p_body, ''), 1000),
          case when p_ok then 'sent' else 'failed' end, left(coalesce(p_error, ''), 300), case when p_ok then now() end);
end;
$$;

-- 처리 기록이 생기면 켜 둔 알림만 대기 줄에 적는다 — 실제로 보낼 수 있을 때만(작업 연결·일시정지 아님·솔라피 키 있음)
create or replace function public.mall_builder_order_events_enqueue()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  o record;
  ns record;
  v_name text;
  v_total text;
  v_bank text;
  v_customer text;
  v_staff text;
  v_head text;
begin
  if new.from_status is not distinct from new.to_status then return new; end if; -- 메모성 기록(세금계산서 등)은 알림 없음
  select * into o from public.mall_builder_orders where id = new.order_id;
  if o.id is null then return new; end if;
  select * into ns from public.mall_builder_store_notify_settings s where s.store_id = o.store_id;
  if ns.store_id is null or coalesce(array_length(ns.kinds, 1), 0) = 0 then return new; end if;
  if not exists (select 1 from public.mall_builder_store_schedulers s where s.store_id = o.store_id and s.job_id is not null and not s.paused) then return new; end if;
  if not exists (select 1 from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id and x.solapi_api_key <> '' and x.solapi_api_secret <> '') then return new; end if;

  select st.name into v_name from public.mall_builder_stores st where st.id = o.store_id;
  v_head := '[' || coalesce(v_name, '쇼핑몰') || '] ';
  v_total := to_char(o.total, 'FM999,999,999,990') || '원';
  v_customer := public.mall_builder_digits(o.receiver ->> 'phone');
  v_staff := ns.staff_phone;

  if new.from_status is null then
    if 'staff_new_order' = any(ns.kinds) and v_staff <> '' then
      insert into public.mall_builder_notifications (store_id, order_id, kind, to_phone, body)
      values (o.store_id, o.id, 'staff_new_order', v_staff,
              v_head || '새 주문 ' || o.order_no || ' · ' || v_total || ' · ' ||
              case when o.is_credit then '외상(결제 완료)' else '무통장(입금 대기)' end ||
              ' · 입금자 ' || coalesce(o.depositor, ''))
      on conflict do nothing;
    end if;
    if new.to_status = 'pending_payment' and 'customer_received' = any(ns.kinds) and v_customer <> '' then
      v_bank := case when coalesce(o.bank ->> 'bank_account', '') <> ''
        then '계좌 ' || coalesce(o.bank ->> 'bank_name', '') || ' ' || (o.bank ->> 'bank_account') || ' (' || coalesce(o.bank ->> 'bank_holder', '') || ')'
        else '입금 계좌는 주문 상세 화면에서 확인해 주세요' end;
      insert into public.mall_builder_notifications (store_id, order_id, kind, to_phone, body)
      values (o.store_id, o.id, 'customer_received', v_customer,
              v_head || '주문 ' || o.order_no || '이 접수되었습니다. 입금 금액 ' || v_total || ', ' || v_bank || '.' ||
              case when o.pay_deadline_at is not null
                then ' 입금 기한 ' || to_char(o.pay_deadline_at at time zone 'Asia/Seoul', 'MM/DD HH24:MI') || ', 지나면 주문이 자동 취소됩니다.'
                else '' end)
      on conflict do nothing;
    end if;
  elsif new.from_status = 'pending_payment' and new.to_status = 'paid' then
    if 'customer_paid' = any(ns.kinds) and v_customer <> '' then
      insert into public.mall_builder_notifications (store_id, order_id, kind, to_phone, body)
      values (o.store_id, o.id, 'customer_paid', v_customer,
              v_head || '주문 ' || o.order_no || ' 입금(' || v_total || ')이 확인되었습니다. 배송을 준비하겠습니다.')
      on conflict do nothing;
    end if;
  elsif new.to_status = 'shipping' then
    if 'customer_shipped' = any(ns.kinds) and v_customer <> '' then
      insert into public.mall_builder_notifications (store_id, order_id, kind, to_phone, body)
      values (o.store_id, o.id, 'customer_shipped', v_customer,
              v_head || '주문 ' || o.order_no || ' 상품을 보냈습니다. ' ||
              coalesce(nullif(o.courier, ''), '택배') || ' 송장 ' || coalesce(nullif(o.tracking_no, ''), '-'))
      on conflict do nothing;
    end if;
  elsif new.to_status = 'cancelled' and new.from_status = 'pending_payment' and new.actor_role = 'system' then
    if 'customer_expired' = any(ns.kinds) and v_customer <> '' then
      insert into public.mall_builder_notifications (store_id, order_id, kind, to_phone, body)
      values (o.store_id, o.id, 'customer_expired', v_customer,
              v_head || '주문 ' || o.order_no || '이 입금 기한이 지나 자동으로 취소되었습니다. 다시 주문해 주시면 감사하겠습니다.')
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;
create or replace trigger mall_builder_order_events_enqueue after insert on public.mall_builder_order_events
  for each row execute function public.mall_builder_order_events_enqueue();

-- 실행 주소: 토큰으로 몰을 찾아 대기 줄을 「보내는 중」으로 꺼내고 솔라피 키와 함께 돌려준다(한 번에 최대 50건)
-- 하루 넘게 못 보낸 줄은 expired로 버린다(오래된 알림을 늦게 보내지 않음)
create or replace function public.mall_builder_notify_claim(p_token_hash text, p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_store uuid;
  v_paused boolean;
  v_creds jsonb;
  v_items jsonb;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token'; end if;
  select s.store_id into v_store from public.mall_builder_store_scheduler_secrets s where s.run_token_hash = p_token_hash;
  if v_store is null then raise exception 'invalid_token'; end if;
  select coalesce(sc.paused, false) into v_paused from public.mall_builder_store_schedulers sc where sc.store_id = v_store;
  if v_paused then return jsonb_build_object('paused', true, 'items', '[]'::jsonb); end if;

  update public.mall_builder_notifications n set status = 'expired', error = '하루 넘게 보내지 못해 버림'
   where n.store_id = v_store and n.status = 'queued' and n.created_at < now() - interval '1 day';

  select jsonb_build_object('api_key', x.solapi_api_key, 'api_secret', x.solapi_api_secret, 'sender_phone', coalesce(ns.sender_phone, ''))
    into v_creds
    from public.mall_builder_store_scheduler_secrets x
    left join public.mall_builder_store_notify_settings ns on ns.store_id = x.store_id
   where x.store_id = v_store;
  if coalesce(v_creds ->> 'api_key', '') = '' or coalesce(v_creds ->> 'api_secret', '') = '' or coalesce(v_creds ->> 'sender_phone', '') = '' then
    return jsonb_build_object('paused', false, 'items', '[]'::jsonb, 'reason', 'no_credentials');
  end if;

  with picked as (
    select n.id from public.mall_builder_notifications n
     where n.store_id = v_store and n.status = 'queued'
     order by n.created_at
     limit least(greatest(coalesce(p_limit, 50), 1), 50)
     for update skip locked
  ), marked as (
    update public.mall_builder_notifications n set status = 'sending'
      from picked where n.id = picked.id
    returning n.id, n.to_phone, n.body, n.created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'to', m.to_phone, 'body', m.body) order by m.created_at), '[]'::jsonb)
    into v_items from marked m;

  return jsonb_build_object('paused', false, 'items', v_items,
    'credentials', case when jsonb_array_length(v_items) > 0 then v_creds else null end);
end;
$$;

-- 실행 주소: 발송 결과 기록 — 같은 몰·「보내는 중」인 줄만 바꾼다. 결과: sent / failed / unknown
create or replace function public.mall_builder_notify_report(p_token_hash text, p_results jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_store uuid;
  v_count integer;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token'; end if;
  select s.store_id into v_store from public.mall_builder_store_scheduler_secrets s where s.run_token_hash = p_token_hash;
  if v_store is null then raise exception 'invalid_token'; end if;
  update public.mall_builder_notifications n set
    status = r.result,
    error = left(coalesce(r.error, ''), 300),
    sent_at = case when r.result = 'sent' then now() else n.sent_at end
  from jsonb_to_recordset(coalesce(p_results, '[]'::jsonb)) as r(id uuid, result text, error text)
  where n.id = r.id and n.store_id = v_store and n.status = 'sending' and r.result in ('sent', 'failed', 'unknown');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
