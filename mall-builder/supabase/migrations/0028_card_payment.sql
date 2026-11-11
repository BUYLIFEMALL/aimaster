-- AI 쇼핑몰 빌더 — 카드 결제(토스페이먼츠 결제위젯) (플랜 docs/PLAN_20261105_CARD_PAYMENT.md)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(drop·revoke·delete 없음)
-- 플랜과 바꾼 점: 주문 pay_method 제약을 바꾸지 않고, 외상(is_credit)과 같은 방식으로 is_card 칸을 더한다(지우기 없음).
-- 시크릿 키는 비밀 표(규칙 0개)에만 있고, 토스 승인·취소·조회는 DB 함수가 http 확장으로 직접 부른다 → 키가 앱·브라우저로 나가지 않는다.
-- 금액은 DB의 주문 금액만 믿는다. 같은 주문 승인은 Idempotency-Key로 한 번만.

-- ── 0028a ── 확장·표·칸 (추가만)
create extension if not exists http with schema extensions;

alter table public.mall_builder_orders add column if not exists is_card boolean not null default false;
alter table public.mall_builder_store_scheduler_secrets add column if not exists toss_secret_key text not null default '';

-- 몰 결제 설정 — 클라이언트 키는 손님 브라우저가 결제창을 열 때 쓰는 공개 값이라 누구나 읽어도 된다
create table if not exists public.mall_builder_store_payment_settings (
  store_id uuid primary key references public.mall_builder_stores (id) on delete cascade,
  toss_client_key text not null default '',
  card_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.mall_builder_store_payment_settings enable row level security;
create policy "mall_builder_store_payment_settings_read" on public.mall_builder_store_payment_settings for select using (true);

-- 카드 결제 기록(주문당 하나). 카드 번호는 저장하지 않는다
create table if not exists public.mall_builder_card_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  order_id uuid not null unique references public.mall_builder_orders (id) on delete cascade,
  payment_key text not null default '',
  amount bigint not null,
  -- requested 승인 요청 중 · done 결제 완료 · failed 실패(돈 안 나감) · unknown 결과 불확실(다시 확인 필요) · partial_canceled 일부 환불 · canceled 전액 환불
  status text not null default 'requested' check (status in ('requested','done','failed','unknown','partial_canceled','canceled')),
  method text not null default '',
  approved_at timestamptz,
  receipt_url text not null default '',
  canceled_amount bigint not null default 0,
  error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mall_builder_card_payments enable row level security;
-- 보기만: 그 몰 운영자, 그 주문의 손님. 쓰기는 함수로만
create policy "mall_builder_card_payments_read" on public.mall_builder_card_payments for select using (
  public.mall_builder_is_store_staff(store_id)
  or exists (select 1 from public.mall_builder_orders o where o.id = order_id and o.user_id = auth.uid()));

-- ── 0028b ── 함수 (함수 정의만 바꾼다. 지금 지워지는 데이터는 없다)

-- 토스 API 호출은 API로 노출되지 않는 비공개 스키마에 둔다(앱·손님이 직접 부를 수 없음 — 공개 RPC 통로가 되지 않게)
create schema if not exists mall_builder_private;

create or replace function mall_builder_private.toss_call(p_secret text, p_method text, p_path text, p_body jsonb, p_idem text)
returns table (status integer, body jsonb) language plpgsql set search_path = '' as $$
declare
  r extensions.http_response;
  h extensions.http_header[];
begin
  h := array[extensions.http_header('Authorization', 'Basic ' || replace(encode(convert_to(p_secret || ':', 'UTF8'), 'base64'), E'\n', ''))];
  if p_idem is not null then h := h || extensions.http_header('Idempotency-Key', p_idem); end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '30000');
  select * into r from extensions.http((p_method, 'https://api.tosspayments.com' || p_path, h, 'application/json',
    case when p_body is null then null else p_body::text end)::extensions.http_request);
  return query select r.status,
    case when coalesce(r.content, '') ~ '^\s*[\{\[]' then r.content::jsonb else jsonb_build_object('raw', left(coalesce(r.content, ''), 200)) end;
end;
$$;

-- 카드 환불(전액·부분) — 결제 완료된 카드 주문만. 실패하면 오류를 던져 부른 쪽(취소)도 함께 되돌린다
create or replace function mall_builder_private.card_refund(p_order_id uuid, p_amount bigint, p_reason text, p_idem text)
returns void language plpgsql set search_path = '' as $$
declare
  cp public.mall_builder_card_payments%rowtype;
  v_secret text;
  v_status integer;
  v_body jsonb;
  v_left bigint;
begin
  select * into cp from public.mall_builder_card_payments where order_id = p_order_id for update;
  if not found or cp.status not in ('done', 'partial_canceled') then return; end if; -- 결제되지 않은 카드 주문은 환불할 것이 없다
  if coalesce(p_amount, 0) <= 0 then return; end if;
  v_left := cp.amount - cp.canceled_amount;
  if p_amount > v_left then raise exception '환불 금액(%원)이 남은 결제 금액(%원)보다 큽니다.', p_amount, v_left; end if;
  select x.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets x where x.store_id = cp.store_id;
  if coalesce(v_secret, '') = '' then raise exception '카드 결제 키가 없어 환불할 수 없습니다. 설정에서 키를 확인해 주세요.'; end if;
  begin
    select t.status, t.body into v_status, v_body from mall_builder_private.toss_call(v_secret, 'POST', '/v1/payments/' || cp.payment_key || '/cancel',
      jsonb_build_object('cancelReason', left(coalesce(nullif(btrim(p_reason), ''), '주문 취소'), 200), 'cancelAmount', p_amount), p_idem) t;
  exception when others then
    raise exception '카드사 연결이 끊겨 취소하지 않았습니다. 잠시 뒤 다시 눌러 주세요(같은 요청은 한 번만 처리됩니다).';
  end;
  if v_status <> 200 then raise exception '카드 환불이 되지 않아 취소하지 않았습니다: %', coalesce(v_body ->> 'message', v_status::text); end if;
  update public.mall_builder_card_payments set
    canceled_amount = canceled_amount + p_amount,
    status = case when canceled_amount + p_amount >= amount then 'canceled' else 'partial_canceled' end,
    updated_at = now()
  where id = cp.id;
end;
$$;

-- 운영자: 카드 결제 설정 저장. 시크릿 키가 null이면 그대로, ''이면 비운다
create or replace function public.mall_builder_payment_save(p_store_id uuid, p_client_key text, p_enabled boolean, p_secret_key text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_client text := btrim(coalesce(p_client_key, '')); v_secret text; v_mode_c text; v_mode_s text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if v_client <> '' and v_client !~ '^(test|live)_gck_[A-Za-z0-9_]{6,100}$' then raise exception '클라이언트 키는 결제위젯 키(test_gck_ 또는 live_gck_로 시작)를 넣어 주세요.'; end if;
  if p_secret_key is not null and btrim(p_secret_key) <> '' and btrim(p_secret_key) !~ '^(test|live)_gsk_[A-Za-z0-9_]{6,100}$' then
    raise exception '시크릿 키는 결제위젯 시크릿 키(test_gsk_ 또는 live_gsk_로 시작)를 넣어 주세요.';
  end if;
  insert into public.mall_builder_store_scheduler_secrets (store_id, toss_secret_key) values (p_store_id, coalesce(btrim(p_secret_key), ''))
    on conflict (store_id) do update set
      toss_secret_key = case when p_secret_key is null then public.mall_builder_store_scheduler_secrets.toss_secret_key else btrim(p_secret_key) end,
      updated_at = now();
  select x.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets x where x.store_id = p_store_id;
  v_mode_c := split_part(v_client, '_', 1);
  v_mode_s := split_part(coalesce(v_secret, ''), '_', 1);
  if v_client <> '' and coalesce(v_secret, '') <> '' and v_mode_c <> v_mode_s then raise exception '클라이언트 키와 시크릿 키의 종류(테스트/라이브)가 다릅니다.'; end if;
  if coalesce(p_enabled, false) and (v_client = '' or coalesce(v_secret, '') = '') then raise exception '카드 결제를 켜려면 클라이언트 키와 시크릿 키를 모두 넣어 주세요.'; end if;
  insert into public.mall_builder_store_payment_settings (store_id, toss_client_key, card_enabled) values (p_store_id, v_client, coalesce(p_enabled, false))
    on conflict (store_id) do update set toss_client_key = excluded.toss_client_key, card_enabled = excluded.card_enabled, updated_at = now();
end;
$$;

-- 운영자: 시크릿 키가 있는지·종류만(값은 돌려주지 않음)
create or replace function public.mall_builder_payment_secret_status(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  select x.toss_secret_key into v from public.mall_builder_store_scheduler_secrets x where x.store_id = p_store_id;
  return jsonb_build_object('has_secret', coalesce(v, '') <> '', 'mode', case when coalesce(v, '') = '' then '' else split_part(v, '_', 1) end);
end;
$$;

-- 손님: 결제창에서 돌아오면 승인. 그 주문의 손님·카드 주문·입금 대기·금액 일치일 때만, DB 안에서 토스 승인 API를 부른다
create or replace function public.mall_builder_card_confirm(p_order_id uuid, p_payment_key text, p_amount bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_secret text;
  v_pay uuid;
  v_status integer;
  v_body jsonb;
  v_existing text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found or o.user_id is distinct from auth.uid() then raise exception '주문을 찾을 수 없습니다.'; end if;
  if not o.is_card then raise exception '카드 결제 주문이 아닙니다.'; end if;
  select cp.status into v_existing from public.mall_builder_card_payments cp where cp.order_id = o.id;
  if v_existing in ('done', 'partial_canceled', 'canceled') then return jsonb_build_object('ok', true, 'already', true); end if;
  if o.status <> 'pending_payment' then raise exception '결제할 수 없는 주문입니다(지금 상태: %).', o.status; end if;
  if p_amount is distinct from o.total then raise exception '결제 금액(%원)이 주문 금액(%원)과 달라 승인하지 않았습니다.', p_amount, o.total; end if;
  if coalesce(p_payment_key, '') !~ '^[A-Za-z0-9_-]{10,200}$' then raise exception '결제 정보가 올바르지 않습니다.'; end if;
  select x.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  if coalesce(v_secret, '') = '' then raise exception '이 몰의 카드 결제 설정이 없습니다.'; end if;

  insert into public.mall_builder_card_payments (store_id, order_id, payment_key, amount, status)
  values (o.store_id, o.id, p_payment_key, o.total, 'requested')
  on conflict (order_id) do update set payment_key = excluded.payment_key, amount = excluded.amount, status = 'requested', error = '', updated_at = now()
  returning id into v_pay;

  begin
    select t.status, t.body into v_status, v_body from mall_builder_private.toss_call(v_secret, 'POST', '/v1/payments/confirm',
      jsonb_build_object('paymentKey', p_payment_key, 'orderId', o.id::text, 'amount', o.total), 'confirm-' || o.id) t;
  exception when others then
    update public.mall_builder_card_payments set status = 'unknown', error = left(sqlerrm, 300), updated_at = now() where id = v_pay;
    return jsonb_build_object('ok', false, 'unknown', true, 'message', '결제 확인 중 연결이 끊겼습니다. 결제가 됐는지 운영자가 확인한 뒤 안내드립니다.');
  end;

  if v_status = 200 and v_body ->> 'status' = 'DONE' and (v_body ->> 'totalAmount')::bigint = o.total then
    update public.mall_builder_card_payments set status = 'done', method = coalesce(v_body ->> 'method', ''),
      approved_at = (v_body ->> 'approvedAt')::timestamptz, receipt_url = coalesce(v_body #>> '{receipt,url}', ''), error = '', updated_at = now()
    where id = v_pay;
    update public.mall_builder_orders set status = 'paid', pay_deadline_at = null, updated_at = now() where id = o.id;
    insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
    values (o.id, 'pending_payment', 'paid', auth.uid(), 'customer', '카드 결제 완료' || coalesce('(' || nullif(v_body ->> 'method', '') || ')', ''));
    return jsonb_build_object('ok', true);
  end if;
  update public.mall_builder_card_payments set
    status = case when v_status >= 500 then 'unknown' else 'failed' end,
    error = left(btrim(coalesce(v_body ->> 'code', '') || ' ' || coalesce(v_body ->> 'message', '')), 300), updated_at = now()
  where id = v_pay;
  return jsonb_build_object('ok', false, 'unknown', v_status >= 500, 'message', coalesce(v_body ->> 'message', '결제를 승인하지 못했습니다.'));
end;
$$;

-- 운영자: 카드 주문 취소·반품 승인 — 상태를 바꾸고(재고 되돌림 포함) 남은 결제 금액을 환불. 환불이 안 되면 전부 되돌림
create or replace function public.mall_builder_card_cancel_order(p_order_id uuid, p_to text, p_note text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_left bigint;
  v_done bigint;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found or not public.mall_builder_is_store_staff(o.store_id) then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  if not o.is_card then raise exception '카드 결제 주문이 아닙니다.'; end if;
  if p_to not in ('cancelled', 'returned') then raise exception '취소·반품 승인만 할 수 있습니다.'; end if;
  if exists (select 1 from public.mall_builder_card_payments cp where cp.order_id = o.id and cp.status in ('requested', 'unknown')) then
    raise exception '결제 확인 중인 카드 주문입니다. 「결제 다시 확인」을 먼저 해 주세요.';
  end if;
  select cp.amount - cp.canceled_amount, cp.canceled_amount into v_left, v_done
    from public.mall_builder_card_payments cp where cp.order_id = o.id and cp.status in ('done', 'partial_canceled');
  perform set_config('mall_builder.card_refund', 'on', true);
  perform public.mall_builder_change_order_status(p_order_id, p_to, p_note, '', '');
  perform mall_builder_private.card_refund(o.id, coalesce(v_left, 0), p_note, 'cancel-' || o.id || '-' || coalesce(v_done, 0));
  perform set_config('mall_builder.card_refund', '', true);
  return case when coalesce(v_left, 0) > 0 then '취소하고 카드 결제 ' || to_char(v_left, 'FM999,999,999,990') || '원을 환불했습니다.' else '취소했습니다(결제 전 주문이라 환불할 금액이 없습니다).' end;
end;
$$;

-- 운영자: 카드 주문 부분 취소 — 기존 부분 취소(0021)로 금액·재고를 다시 계산한 뒤, 줄어든 금액만큼 부분 환불
create or replace function public.mall_builder_card_cancel_items(p_order_id uuid, p_items jsonb, p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_after bigint;
  v_res jsonb;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found or not public.mall_builder_is_store_staff(o.store_id) then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  if not o.is_card then raise exception '카드 결제 주문이 아닙니다.'; end if;
  if exists (select 1 from public.mall_builder_card_payments cp where cp.order_id = o.id and cp.status in ('requested', 'unknown')) then
    raise exception '결제 확인 중인 카드 주문입니다. 「결제 다시 확인」을 먼저 해 주세요.';
  end if;
  perform set_config('mall_builder.card_refund', 'on', true);
  v_res := public.mall_builder_cancel_order_items(p_order_id, p_items, p_note);
  select total into v_after from public.mall_builder_orders where id = p_order_id;
  perform mall_builder_private.card_refund(o.id, o.total - v_after, p_note, 'partial-' || o.id || '-' || v_after);
  perform set_config('mall_builder.card_refund', '', true);
  return coalesce(v_res, '{}'::jsonb) || jsonb_build_object('refunded', o.total - v_after);
end;
$$;

-- 운영자: 결과가 불확실한 카드 결제를 토스에 다시 물어 맞춘다
create or replace function public.mall_builder_card_recheck(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  cp public.mall_builder_card_payments%rowtype;
  v_secret text;
  v_status integer;
  v_body jsonb;
  v_st text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found or not public.mall_builder_is_store_staff(o.store_id) then raise exception '이 주문을 볼 권한이 없습니다.'; end if;
  select * into cp from public.mall_builder_card_payments where order_id = o.id for update;
  if not found or cp.payment_key = '' then raise exception '결제창에서 돌아온 기록이 없어 확인할 수 없습니다(결제되지 않은 것으로 보입니다).'; end if;
  select x.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  if coalesce(v_secret, '') = '' then raise exception '카드 결제 키가 없습니다.'; end if;
  begin
    select t.status, t.body into v_status, v_body from mall_builder_private.toss_call(v_secret, 'GET', '/v1/payments/' || cp.payment_key, null, null) t;
  exception when others then
    raise exception '카드사에 연결하지 못했습니다. 잠시 뒤 다시 눌러 주세요.';
  end;
  if v_status <> 200 then raise exception '확인하지 못했습니다: %', coalesce(v_body ->> 'message', v_status::text); end if;
  v_st := v_body ->> 'status';
  if v_st = 'DONE' and cp.status in ('requested', 'unknown', 'failed') then
    update public.mall_builder_card_payments set status = 'done', method = coalesce(v_body ->> 'method', ''),
      approved_at = (v_body ->> 'approvedAt')::timestamptz, receipt_url = coalesce(v_body #>> '{receipt,url}', ''), error = '', updated_at = now()
    where id = cp.id;
    if o.status = 'pending_payment' and (v_body ->> 'totalAmount')::bigint = o.total then
      update public.mall_builder_orders set status = 'paid', pay_deadline_at = null, updated_at = now() where id = o.id;
      insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
      values (o.id, 'pending_payment', 'paid', auth.uid(), 'staff', '카드 결제 다시 확인 — 결제 완료');
    end if;
  elsif v_st in ('ABORTED', 'EXPIRED') and cp.status in ('requested', 'unknown') then
    update public.mall_builder_card_payments set status = 'failed', error = '토스 상태 ' || v_st, updated_at = now() where id = cp.id;
  end if;
  return jsonb_build_object('toss_status', v_st);
end;
$$;

-- 카드 주문 보호: 환불 없이 결제된 카드 주문을 취소·부분 취소하거나, 결제 확인 중인 주문을 취소하지 못하게 한다
create or replace function public.mall_builder_orders_card_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pay text;
begin
  if not old.is_card or current_setting('mall_builder.card_refund', true) = 'on' then return new; end if;
  select cp.status into v_pay from public.mall_builder_card_payments cp where cp.order_id = old.id;
  if new.status in ('cancelled', 'returned') and old.status not in ('cancelled', 'returned') then
    if v_pay in ('requested', 'unknown') then raise exception '결제 확인 중인 카드 주문입니다. 운영자가 「결제 다시 확인」을 먼저 해 주세요.'; end if;
    if v_pay in ('done', 'partial_canceled') then raise exception '카드 결제 주문은 「카드 환불과 함께 취소」로 처리해 주세요.'; end if;
  end if;
  if new.total < old.total and v_pay in ('done', 'partial_canceled') then raise exception '카드 결제 주문의 부분 취소는 카드 환불과 함께 처리해 주세요.'; end if;
  return new;
end;
$$;
create or replace trigger mall_builder_orders_card_guard before update on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_card_guard();

-- ── 0028c ── 기존 함수 다시 정의(카드 반영). 지워지는 데이터 없음

-- 장바구니 주문(6칸): 결제 방법 'card' 추가 — 몰이 카드 결제를 켰을 때만. 카드 주문은 입금 대기로 시작해 결제창 승인 때 결제 완료,
-- 결제 기한 30분(입금 기한 자동 취소가 켜져 있으면 결제하지 않은 주문의 재고를 되돌린다). 입금자명이 비면 받는 분 이름
create or replace function public.mall_builder_place_order(p_store_id uuid, p_address_id uuid, p_depositor text, p_memo text, p_expected_total bigint, p_pay_method text)
returns table(order_id uuid, order_no text)
language plpgsql security definer set search_path to '' as $function$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_store public.mall_builder_stores%rowtype;
  v_customer public.mall_builder_store_customers%rowtype;
  v_addr public.mall_builder_customer_addresses%rowtype;
  v_viewer text;
  v_grade_name text;
  v_region text;
  v_default uuid;
  v_order uuid;
  v_seq integer;
  v_no text;
  v_line record;
  v_has_opt boolean;
  v_extra bigint;
  v_base bigint;
  v_unit bigint;
  v_before bigint;
  v_tier public.mall_builder_product_volume_tiers%rowtype;
  v_avail integer;
  v_key text;
  v_groups jsonb := '{}'::jsonb;
  v_subtotal bigint := 0;
  v_ship bigint := 0;
  v_count integer := 0;
  v_policy public.mall_builder_shipping_policies%rowtype;
  v_fee bigint;
  v_breakdown jsonb;
  v_info jsonb;
  v_balance bigint;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_pay_method not in ('bank', 'credit', 'card') then raise exception '결제 방법을 골라 주세요.'; end if;
  select * into v_store from public.mall_builder_stores s where s.id = p_store_id and s.status = 'active' for update;
  if not found then raise exception '주문할 수 없는 몰입니다.'; end if;
  if p_pay_method = 'card' and not exists (
    select 1 from public.mall_builder_store_payment_settings ps join public.mall_builder_store_scheduler_secrets x on x.store_id = ps.store_id
     where ps.store_id = p_store_id and ps.card_enabled and ps.toss_client_key <> '' and x.toss_secret_key <> '') then
    raise exception '이 몰은 지금 카드 결제를 받지 않습니다.';
  end if;
  select * into v_customer from public.mall_builder_store_customers c where c.store_id = p_store_id and c.user_id = v_uid for update;
  if not found then raise exception '이 몰에 가입한 뒤 주문할 수 있습니다.'; end if;
  select * into v_addr from public.mall_builder_customer_addresses a where a.id = p_address_id and a.customer_id = v_customer.id;
  if not found then raise exception '배송지를 골라 주세요.'; end if;
  if p_pay_method = 'card' and btrim(coalesce(p_depositor, '')) = '' then p_depositor := left(v_addr.receiver, 20); end if;
  if char_length(btrim(coalesce(p_depositor, ''))) not between 1 and 20 then raise exception '입금자명을 1~20자로 입력해 주세요.'; end if;
  if char_length(coalesce(p_memo, '')) > 200 then raise exception '배송 메모는 200자 이내로 입력해 주세요.'; end if;

  select g.name, case
      when v_customer.approval_status = 'approved' and g.is_business then 'business'
      when v_customer.approval_status = 'pending' then 'pending'
      else 'consumer' end
    into v_grade_name, v_viewer
    from public.mall_builder_customer_grades g where g.id = v_customer.grade_id;
  v_viewer := coalesce(v_viewer, case when v_customer.approval_status = 'pending' then 'pending' else 'consumer' end);
  if p_pay_method = 'credit' and v_viewer <> 'business' then raise exception '외상은 승인된 사업자 회원만 쓸 수 있습니다.'; end if;
  if p_pay_method = 'credit' and v_customer.credit_limit <= 0 then raise exception '외상 한도가 없습니다. 운영자에게 문의해 주세요.'; end if;

  perform 1 from public.mall_builder_products p
    where p.id in (select ci.product_id from public.mall_builder_cart_items ci where ci.store_id = p_store_id and ci.user_id = v_uid)
    order by p.id for update;
  perform 1 from public.mall_builder_product_variants v
    where v.id in (select ci.variant_id from public.mall_builder_cart_items ci where ci.store_id = p_store_id and ci.user_id = v_uid)
    order by v.id for update;

  v_region := public.mall_builder_region(v_addr.zip);
  select sp.id into v_default from public.mall_builder_shipping_policies sp where sp.store_id = p_store_id and sp.is_default;
  select coalesce(max(o.seq), 0) + 1 into v_seq from public.mall_builder_orders o where o.store_id = p_store_id;
  v_no := to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');
  v_info := coalesce(v_store.business_info, '{}'::jsonb);

  insert into public.mall_builder_orders (store_id, seq, order_no, user_id, customer_id, receiver, depositor, bank, memo)
  values (
    p_store_id, v_seq, v_no, v_uid, v_customer.id,
    jsonb_build_object('label', v_addr.label, 'receiver', v_addr.receiver, 'phone', v_addr.phone, 'zip', v_addr.zip, 'addr1', v_addr.addr1, 'addr2', v_addr.addr2, 'region', v_region),
    btrim(p_depositor),
    jsonb_build_object('bank_name', v_info ->> 'bank_name', 'bank_account', v_info ->> 'bank_account', 'bank_holder', v_info ->> 'bank_holder'),
    coalesce(p_memo, '')
  ) returning id into v_order;

  for v_line in
    select ci.qty, p.id as product_id, p.name, p.status, p.base_price, p.stock_mode, p.stock, p.option_groups, p.images, p.shipping_policy_id,
           p.visibility, p.price_visibility, p.moq, p.order_unit, p.max_qty,
           v.id as variant_id, v.key as variant_key, v.extra_price, v.stock as variant_stock, v.is_active,
           gp.price as grade_price, gp.discount_rate as grade_rate
    from public.mall_builder_cart_items ci
    join public.mall_builder_products p on p.id = ci.product_id
    left join public.mall_builder_product_variants v on v.id = ci.variant_id
    left join public.mall_builder_product_grade_prices gp on gp.product_id = p.id and gp.grade_id = v_customer.grade_id
    where ci.store_id = p_store_id and ci.user_id = v_uid and p.status not in ('draft', 'hidden')
    order by ci.created_at
  loop
    v_count := v_count + 1;
    if v_line.visibility = 'business_only' and v_viewer <> 'business' then raise exception '「%」은(는) 사업자 회원 전용 상품입니다.', v_line.name; end if;
    if v_line.price_visibility = 'approved_business' and v_viewer <> 'business' then raise exception '「%」은(는) 사업자 승인 후 가격이 공개됩니다.', v_line.name; end if;
    if v_line.status = 'sold_out' then raise exception '「%」은(는) 품절된 상품입니다.', v_line.name; end if;
    if v_line.status <> 'on_sale' then raise exception '「%」은(는) 지금 판매하지 않는 상품입니다.', v_line.name; end if;
    v_has_opt := jsonb_array_length(coalesce(v_line.option_groups, '[]'::jsonb)) > 0;
    if v_has_opt and v_line.variant_id is null then raise exception '「%」의 옵션을 선택해 주세요.', v_line.name; end if;
    if not v_has_opt and v_line.variant_id is not null then raise exception '「%」은(는) 옵션이 없는 상품입니다.', v_line.name; end if;
    if v_line.variant_id is not null and not v_line.is_active then raise exception '「% %」 옵션은 판매하지 않습니다.', v_line.name, v_line.variant_key; end if;

    v_extra := case when v_has_opt then coalesce(v_line.extra_price, 0) else 0 end;
    v_base := v_line.base_price + v_extra;
    v_unit := greatest(0, case
      when v_line.grade_price is not null then v_line.grade_price + v_extra
      when v_line.grade_rate is not null then floor(v_base * (100 - v_line.grade_rate) / 100.0)::bigint
      else v_base end);
    v_breakdown := jsonb_build_array(jsonb_build_object('label', '판매가', 'amount', v_line.base_price));
    if v_extra <> 0 then
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '옵션 추가금', 'amount', v_extra));
    end if;
    if v_unit <> v_base then
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '등급가(' || coalesce(v_grade_name, '') || ')', 'amount', v_unit - v_base));
    end if;

    select * into v_tier from public.mall_builder_product_volume_tiers t
      where t.product_id = v_line.product_id and t.min_qty <= v_line.qty order by t.min_qty desc limit 1;
    if found then
      v_before := v_unit;
      v_unit := case v_tier.discount_type
        when 'rate' then floor(v_unit * (100 - v_tier.value) / 100.0)::bigint
        when 'amount' then greatest(0, v_unit - v_tier.value)
        else least(v_unit, v_tier.value + v_extra) end;
      if v_unit <> v_before then
        v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '수량 할인(' || v_tier.min_qty || '개 이상)', 'amount', v_unit - v_before));
      end if;
    end if;

    if v_line.qty < v_line.moq then raise exception '「%」은(는) 최소 %개부터 주문할 수 있습니다.', v_line.name, v_line.moq; end if;
    if v_line.order_unit > 1 and v_line.qty % v_line.order_unit <> 0 then raise exception '「%」은(는) %개 단위로 주문해 주세요.', v_line.name, v_line.order_unit; end if;
    if v_line.max_qty is not null and v_line.qty > v_line.max_qty then raise exception '「%」은(는) 최대 %개까지 주문할 수 있습니다.', v_line.name, v_line.max_qty; end if;

    if v_line.stock_mode = 'product' then
      v_avail := case when v_has_opt then v_line.variant_stock else v_line.stock end;
      if v_avail <= 0 then raise exception '「%」은(는) 품절입니다.', v_line.name || coalesce(' ' || v_line.variant_key, ''); end if;
      if v_line.qty > v_avail then raise exception '「%」 재고가 %개 남았습니다.', v_line.name || coalesce(' ' || v_line.variant_key, ''), v_avail; end if;
      if v_has_opt then
        update public.mall_builder_product_variants set stock = stock - v_line.qty where id = v_line.variant_id;
      else
        update public.mall_builder_products set stock = stock - v_line.qty where id = v_line.product_id;
      end if;
    end if;

    insert into public.mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, image_url, unit_price, qty, line_total, price_breakdown, shipping_policy_id)
    values (v_order, v_line.product_id, v_line.variant_id, v_line.name, coalesce(v_line.variant_key, ''), v_line.images -> 0 ->> 'url',
            v_unit, v_line.qty, v_unit * v_line.qty, v_breakdown, coalesce(v_line.shipping_policy_id, v_default));

    v_subtotal := v_subtotal + v_unit * v_line.qty;
    v_key := coalesce(coalesce(v_line.shipping_policy_id, v_default)::text, 'none');
    v_groups := jsonb_set(v_groups, array[v_key], to_jsonb(coalesce((v_groups ->> v_key)::bigint, 0) + v_unit * v_line.qty));
  end loop;
  if v_count = 0 then raise exception '장바구니가 비어 있습니다.'; end if;

  for v_key in select jsonb_object_keys(v_groups) loop
    continue when v_key = 'none';
    select * into v_policy from public.mall_builder_shipping_policies sp where sp.id = v_key::uuid;
    continue when not found;
    v_fee := case v_policy.type
      when 'fixed' then v_policy.base_fee
      when 'conditional' then case when v_policy.free_over is not null and (v_groups ->> v_key)::bigint >= v_policy.free_over then 0 else v_policy.base_fee end
      else 0 end;
    if v_region = 'jeju' then v_fee := v_fee + v_policy.jeju_fee; end if;
    if v_region = 'island' then v_fee := v_fee + v_policy.island_fee; end if;
    v_ship := v_ship + v_fee;
  end loop;

  if p_expected_total is distinct from v_subtotal + v_ship then
    raise exception '가격이 바뀌었습니다. 주문서를 다시 확인해 주세요. (현재 %원)', to_char(v_subtotal + v_ship, 'FM999,999,999,999');
  end if;

  update public.mall_builder_orders set subtotal = v_subtotal, shipping_fee = v_ship, total = v_subtotal + v_ship where id = v_order;

  if p_pay_method = 'credit' then
    select coalesce(sum(l.amount), 0) into v_balance from public.mall_builder_credit_ledger l where l.customer_id = v_customer.id;
    if v_balance + v_subtotal + v_ship > v_customer.credit_limit then
      raise exception '외상 한도를 넘습니다. (남은 한도 %원)', to_char(greatest(0, v_customer.credit_limit - v_balance), 'FM999,999,999,999');
    end if;
    update public.mall_builder_orders set is_credit = true, status = 'paid' where id = v_order;
    insert into public.mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note, actor_id)
    values (p_store_id, v_customer.id, v_order, 'charge', v_subtotal + v_ship, v_balance + v_subtotal + v_ship, '주문 ' || v_no, v_uid);
    insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
    values (v_order, null, 'paid', v_uid, 'customer', '외상 주문(결제 완료)');
  elsif p_pay_method = 'card' then
    update public.mall_builder_orders set is_card = true, pay_deadline_at = now() + interval '30 minutes' where id = v_order;
    insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
    values (v_order, null, 'pending_payment', v_uid, 'customer', '주문 접수(카드 결제 대기)');
  else
    insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
    values (v_order, null, 'pending_payment', v_uid, 'customer', '주문 접수(무통장 입금 대기)');
  end if;
  return query select v_order, v_no;
end;
$function$;

-- 알림(0026 + 카드): 카드 주문은 접수 때 보내지 않고, 결제가 끝났을 때 「새 주문 → 운영자」·「결제 완료 → 손님」. 결제하지 않아 취소된 카드 주문은 알리지 않음
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
  v_card_paid boolean;
begin
  if new.from_status is not distinct from new.to_status then return new; end if;
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

  select st.name into v_name from public.mall_builder_stores st where st.id = o.store_id;
  v_head := '[' || coalesce(v_name, '쇼핑몰') || '] ';
  v_total := to_char(o.total, 'FM999,999,999,990') || '원';
  v_phone := public.mall_builder_digits(o.receiver ->> 'phone');
  select lower(u.email) into v_email from auth.users u where u.id = o.user_id;
  v_card_paid := o.is_card and new.from_status = 'pending_payment' and new.to_status = 'paid';

  foreach v_kind in array array['staff_new_order','customer_received','customer_paid','customer_shipped','customer_expired'] loop
    v_body := null;
    v_to_staff := v_kind = 'staff_new_order';
    if v_kind = 'staff_new_order' and ((new.from_status is null and not o.is_card) or v_card_paid) then
      v_subject := '새 주문 ' || o.order_no || ' · ' || v_total;
      v_body := v_head || '새 주문 ' || o.order_no || ' · ' || v_total || ' · ' ||
                case when o.is_card then '카드 결제 완료' when o.is_credit then '외상(결제 완료)' else '무통장(입금 대기)' end ||
                case when o.is_card then '' else ' · 입금자 ' || coalesce(o.depositor, '') end;
    elsif v_kind = 'customer_received' and new.from_status is null and new.to_status = 'pending_payment' and not o.is_card then
      v_bank := case when coalesce(o.bank ->> 'bank_account', '') <> ''
        then '계좌 ' || coalesce(o.bank ->> 'bank_name', '') || ' ' || (o.bank ->> 'bank_account') || ' (' || coalesce(o.bank ->> 'bank_holder', '') || ')'
        else '입금 계좌는 주문 상세 화면에서 확인해 주세요' end;
      v_subject := '주문 ' || o.order_no || ' 접수 — 입금 안내';
      v_body := v_head || '주문 ' || o.order_no || '이 접수되었습니다. 입금 금액 ' || v_total || ', ' || v_bank || '.' ||
                case when o.pay_deadline_at is not null
                  then ' 입금 기한 ' || to_char(o.pay_deadline_at at time zone 'Asia/Seoul', 'MM/DD HH24:MI') || ', 지나면 주문이 자동 취소됩니다.'
                  else '' end;
    elsif v_kind = 'customer_paid' and new.from_status = 'pending_payment' and new.to_status = 'paid' then
      v_subject := '주문 ' || o.order_no || case when o.is_card then ' 결제 완료' else ' 입금 확인' end;
      v_body := v_head || '주문 ' || o.order_no ||
                case when o.is_card then ' 카드 결제(' || v_total || ')가 완료되었습니다. 배송을 준비하겠습니다.'
                     else ' 입금(' || v_total || ')이 확인되었습니다. 배송을 준비하겠습니다.' end;
    elsif v_kind = 'customer_shipped' and new.to_status = 'shipping' then
      v_subject := '주문 ' || o.order_no || ' 발송 안내';
      v_body := v_head || '주문 ' || o.order_no || ' 상품을 보냈습니다. ' ||
                coalesce(nullif(o.courier, ''), '택배') || ' 송장 ' || coalesce(nullif(o.tracking_no, ''), '-');
    elsif v_kind = 'customer_expired' and new.to_status = 'cancelled' and new.from_status = 'pending_payment' and new.actor_role = 'system' and not o.is_card then
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

-- 입금 기한 자동 취소(0024 + 카드): 결제 확인 중이거나 결제된 카드 주문은 건드리지 않는다(결제하지 않은 카드 주문만 30분 뒤 정리)
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
    select o.id, o.status, o.is_card from public.mall_builder_orders o
     where o.store_id = v_store and o.status = 'pending_payment' and o.pay_deadline_at is not null and o.pay_deadline_at < now()
       and not exists (select 1 from public.mall_builder_card_payments cp where cp.order_id = o.id and cp.status in ('requested', 'unknown', 'done', 'partial_canceled'))
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
    values (v_order.id, v_order.status, 'cancelled', null, 'system',
            case when v_order.is_card then '카드 결제 기한(30분) 초과 자동 취소' else '입금 기한 초과 자동 취소' end);
    v_count := v_count + 1;
  end loop;

  update public.mall_builder_store_schedulers sc set
    last_run_at = now(), last_cancelled = v_count, total_cancelled = sc.total_cancelled + v_count
  where sc.store_id = v_store;
  return jsonb_build_object('paused', false, 'cancelled', v_count);
end;
$$;
