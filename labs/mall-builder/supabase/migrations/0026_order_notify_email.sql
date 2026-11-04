-- AI 쇼핑몰 빌더 — 주문 알림 2단계: 메일(Resend) (플랜 docs/PLAN_20261104_ORDER_NOTIFY.md §7)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(drop·revoke·delete 없음 — 확인 창 방지)
-- 0025와 같은 대기 줄(mall_builder_notifications)에 channel='email' 줄을 더한다. 0025의 고유 제약 (order_id, kind)를 지우지 않으려고
-- 메일 줄의 kind는 앞에 'email_'을 붙인다(예: email_customer_paid) — 같은 주문·같은 종류·같은 채널은 한 번만.
-- Resend 키는 D8 비밀 표(규칙 0개)에 두고, 토큰 확인을 통과한 꺼내기 함수와 그 몰 운영자 함수만 읽는다.
-- 손님 메일은 주문한 사람의 로그인 메일(auth.users.email)을 트리거 안에서 읽는다(손님 쪽에서 키·다른 사람 메일을 읽는 길 없음).

-- ── 0026a ── 칸 (추가만)
alter table public.mall_builder_store_scheduler_secrets add column if not exists resend_api_key text not null default '';
alter table public.mall_builder_store_notify_settings add column if not exists email_from text not null default '';   -- 보내는 주소(인증한 도메인)
alter table public.mall_builder_store_notify_settings add column if not exists staff_email text not null default '';  -- 운영자가 받을 메일
alter table public.mall_builder_store_notify_settings add column if not exists email_kinds text[] not null default '{}';
alter table public.mall_builder_store_notify_settings add constraint mall_builder_store_notify_settings_email_kinds check (
  email_kinds <@ array['staff_new_order','customer_received','customer_paid','customer_shipped','customer_expired']::text[]);
alter table public.mall_builder_notifications add column if not exists to_email text not null default '';
alter table public.mall_builder_notifications add column if not exists subject text not null default '';
create index if not exists mall_builder_notifications_channel_queue on public.mall_builder_notifications (store_id, channel, status, created_at);

-- ── 0026b ── 함수 (함수 정의만 바꾼다. 지금 지워지는 데이터는 없다)

-- 운영자: 메일 알림 설정·Resend 키 저장. 키가 null이면 그대로, ''이면 비운다
create or replace function public.mall_builder_email_save(
  p_store_id uuid, p_from text, p_staff_email text, p_kinds text[], p_api_key text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_from text := lower(btrim(coalesce(p_from, ''))); v_staff text := lower(btrim(coalesce(p_staff_email, '')));
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if v_from <> '' and v_from !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then raise exception '보내는 주소 형식이 올바르지 않습니다.'; end if;
  if v_staff <> '' and v_staff !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then raise exception '받을 메일 형식이 올바르지 않습니다.'; end if;
  if not (coalesce(p_kinds, '{}') <@ array['staff_new_order','customer_received','customer_paid','customer_shipped','customer_expired']::text[]) then
    raise exception '알 수 없는 알림 종류입니다.';
  end if;
  if char_length(coalesce(p_api_key, '')) > 200 then raise exception 'Resend 키가 너무 깁니다.'; end if;
  insert into public.mall_builder_store_notify_settings (store_id, email_from, staff_email, email_kinds)
    values (p_store_id, v_from, v_staff, coalesce(p_kinds, '{}'))
    on conflict (store_id) do update set email_from = excluded.email_from, staff_email = excluded.staff_email, email_kinds = excluded.email_kinds, updated_at = now();
  insert into public.mall_builder_store_scheduler_secrets (store_id, resend_api_key)
    values (p_store_id, coalesce(btrim(p_api_key), ''))
    on conflict (store_id) do update set
      resend_api_key = case when p_api_key is null then public.mall_builder_store_scheduler_secrets.resend_api_key else btrim(p_api_key) end,
      updated_at = now();
end;
$$;

-- 운영자: 자기 몰 Resend 키·보내는 주소 읽기(시험 메일을 서버 동작에서 보낼 때만)
create or replace function public.mall_builder_email_credentials(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  select jsonb_build_object('api_key', x.resend_api_key, 'from', coalesce(ns.email_from, ''), 'staff_email', coalesce(ns.staff_email, ''))
    into v
    from public.mall_builder_store_scheduler_secrets x
    left join public.mall_builder_store_notify_settings ns on ns.store_id = x.store_id
   where x.store_id = p_store_id;
  return coalesce(v, jsonb_build_object('api_key', '', 'from', '', 'staff_email', ''));
end;
$$;

-- 운영자: 시험 메일 결과 기록(주문 없음)
create or replace function public.mall_builder_email_log_test(p_store_id uuid, p_to text, p_subject text, p_body text, p_ok boolean, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  insert into public.mall_builder_notifications (store_id, order_id, kind, channel, to_phone, to_email, subject, body, status, error, sent_at)
  values (p_store_id, null, 'email_test', 'email', '', left(lower(coalesce(p_to, '')), 200), left(coalesce(p_subject, ''), 200), left(coalesce(p_body, ''), 1000),
          case when p_ok then 'sent' else 'failed' end, left(coalesce(p_error, ''), 300), case when p_ok then now() end);
end;
$$;

-- 처리 기록이 생기면 켜 둔 알림만 대기 줄에 적는다(문자·메일). 실제로 보낼 수 있을 때만:
-- 공통 = 작업 연결·일시정지 아님, 문자 = 솔라피 키·시크릿, 메일 = Resend 키·보내는 주소
create or replace function public.mall_builder_order_events_enqueue()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  o record;
  ns record;
  v_sms boolean;
  v_mail boolean;
  v_name text;
  v_head text;
  v_total text;
  v_bank text;
  v_phone text;
  v_email text;
  v_kind text;
  v_to_staff boolean;
  v_subject text;
  v_body text;
begin
  if new.from_status is not distinct from new.to_status then return new; end if; -- 메모성 기록(세금계산서 등)은 알림 없음
  select * into o from public.mall_builder_orders where id = new.order_id;
  if o.id is null then return new; end if;
  select * into ns from public.mall_builder_store_notify_settings s where s.store_id = o.store_id;
  if ns.store_id is null then return new; end if;
  if not exists (select 1 from public.mall_builder_store_schedulers s where s.store_id = o.store_id and s.job_id is not null and not s.paused) then return new; end if;
  select coalesce(array_length(ns.kinds, 1), 0) > 0 and x.solapi_api_key <> '' and x.solapi_api_secret <> '',
         coalesce(array_length(ns.email_kinds, 1), 0) > 0 and x.resend_api_key <> '' and ns.email_from <> ''
    into v_sms, v_mail
    from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  if not coalesce(v_sms, false) and not coalesce(v_mail, false) then return new; end if;

  -- 이번 기록이 어떤 알림인지(하나의 기록에서 최대 2종: 새 주문(운영자) + 주문 접수(손님))
  select st.name into v_name from public.mall_builder_stores st where st.id = o.store_id;
  v_head := '[' || coalesce(v_name, '쇼핑몰') || '] ';
  v_total := to_char(o.total, 'FM999,999,999,990') || '원';
  v_phone := public.mall_builder_digits(o.receiver ->> 'phone');
  select lower(u.email) into v_email from auth.users u where u.id = o.user_id;

  foreach v_kind in array array['staff_new_order','customer_received','customer_paid','customer_shipped','customer_expired'] loop
    v_body := null;
    v_to_staff := v_kind = 'staff_new_order';
    if v_kind = 'staff_new_order' and new.from_status is null then
      v_subject := '새 주문 ' || o.order_no || ' · ' || v_total;
      v_body := v_head || '새 주문 ' || o.order_no || ' · ' || v_total || ' · ' ||
                case when o.is_credit then '외상(결제 완료)' else '무통장(입금 대기)' end || ' · 입금자 ' || coalesce(o.depositor, '');
    elsif v_kind = 'customer_received' and new.from_status is null and new.to_status = 'pending_payment' then
      v_bank := case when coalesce(o.bank ->> 'bank_account', '') <> ''
        then '계좌 ' || coalesce(o.bank ->> 'bank_name', '') || ' ' || (o.bank ->> 'bank_account') || ' (' || coalesce(o.bank ->> 'bank_holder', '') || ')'
        else '입금 계좌는 주문 상세 화면에서 확인해 주세요' end;
      v_subject := '주문 ' || o.order_no || ' 접수 — 입금 안내';
      v_body := v_head || '주문 ' || o.order_no || '이 접수되었습니다. 입금 금액 ' || v_total || ', ' || v_bank || '.' ||
                case when o.pay_deadline_at is not null
                  then ' 입금 기한 ' || to_char(o.pay_deadline_at at time zone 'Asia/Seoul', 'MM/DD HH24:MI') || ', 지나면 주문이 자동 취소됩니다.'
                  else '' end;
    elsif v_kind = 'customer_paid' and new.from_status = 'pending_payment' and new.to_status = 'paid' then
      v_subject := '주문 ' || o.order_no || ' 입금 확인';
      v_body := v_head || '주문 ' || o.order_no || ' 입금(' || v_total || ')이 확인되었습니다. 배송을 준비하겠습니다.';
    elsif v_kind = 'customer_shipped' and new.to_status = 'shipping' then
      v_subject := '주문 ' || o.order_no || ' 발송 안내';
      v_body := v_head || '주문 ' || o.order_no || ' 상품을 보냈습니다. ' ||
                coalesce(nullif(o.courier, ''), '택배') || ' 송장 ' || coalesce(nullif(o.tracking_no, ''), '-');
    elsif v_kind = 'customer_expired' and new.to_status = 'cancelled' and new.from_status = 'pending_payment' and new.actor_role = 'system' then
      v_subject := '주문 ' || o.order_no || ' 자동 취소 안내';
      v_body := v_head || '주문 ' || o.order_no || '이 입금 기한이 지나 자동으로 취소되었습니다. 다시 주문해 주시면 감사하겠습니다.';
    end if;
    continue when v_body is null;

    if coalesce(v_sms, false) and v_kind = any(ns.kinds) then
      if (v_to_staff and ns.staff_phone <> '') or (not v_to_staff and v_phone <> '') then
        insert into public.mall_builder_notifications (store_id, order_id, kind, channel, to_phone, body)
        values (o.store_id, o.id, v_kind, 'sms', case when v_to_staff then ns.staff_phone else v_phone end, v_body)
        on conflict do nothing;
      end if;
    end if;
    if coalesce(v_mail, false) and v_kind = any(ns.email_kinds) then
      if (v_to_staff and ns.staff_email <> '') or (not v_to_staff and coalesce(v_email, '') <> '') then
        insert into public.mall_builder_notifications (store_id, order_id, kind, channel, to_phone, to_email, subject, body)
        values (o.store_id, o.id, 'email_' || v_kind, 'email', '', case when v_to_staff then ns.staff_email else v_email end, v_head || v_subject, v_body)
        on conflict do nothing;
      end if;
    end if;
  end loop;
  return new;
end;
$$;

-- 문자 꺼내기: 0025와 같고 channel='sms'만(메일 줄을 문자로 보내지 않게)
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
     where n.store_id = v_store and n.status = 'queued' and n.channel = 'sms'
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

-- 메일 꺼내기: 토큰으로 몰을 찾아 channel='email' 대기 줄을 「보내는 중」으로 꺼내고 Resend 키·보내는 주소·몰 이름·주소를 돌려준다(최대 50건)
create or replace function public.mall_builder_email_claim(p_token_hash text, p_limit integer default 50)
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

  select jsonb_build_object('api_key', x.resend_api_key, 'from', coalesce(ns.email_from, ''), 'store_name', st.name, 'slug', st.slug)
    into v_creds
    from public.mall_builder_store_scheduler_secrets x
    join public.mall_builder_stores st on st.id = x.store_id
    left join public.mall_builder_store_notify_settings ns on ns.store_id = x.store_id
   where x.store_id = v_store;
  if coalesce(v_creds ->> 'api_key', '') = '' or coalesce(v_creds ->> 'from', '') = '' then
    return jsonb_build_object('paused', false, 'items', '[]'::jsonb, 'reason', 'no_credentials');
  end if;

  with picked as (
    select n.id from public.mall_builder_notifications n
     where n.store_id = v_store and n.status = 'queued' and n.channel = 'email'
     order by n.created_at
     limit least(greatest(coalesce(p_limit, 50), 1), 50)
     for update skip locked
  ), marked as (
    update public.mall_builder_notifications n set status = 'sending'
      from picked where n.id = picked.id
    returning n.id, n.order_id, n.kind, n.to_email, n.subject, n.body, n.created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'order_id', m.order_id, 'kind', m.kind, 'to', m.to_email, 'subject', m.subject, 'body', m.body)
                            order by m.created_at), '[]'::jsonb)
    into v_items from marked m;

  return jsonb_build_object('paused', false, 'items', v_items,
    'credentials', case when jsonb_array_length(v_items) > 0 then v_creds else null end);
end;
$$;
