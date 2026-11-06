-- 0029 카드 결제 안전장치(D11 점검 반영, 2026-11-06). 함수 정의만 바꾼다 — 지워지는 데이터·표·권한 없음
-- 1) 토스 호출 대기 시간을 DB 시간 제한(손님 요청 8초) 안으로: 남은 시간에 맞춰 줄이고(최대 6초, 연결 3초),
--    승인은 남은 시간이 부족하면 토스를 부르지 않고 멈춘다 → 「토스는 결제됐는데 DB 기록이 통째로 되돌려지는」 경우를 없앤다
-- 2) 운영자 「입금 확인」 등으로 결제 안 된 카드 주문을 결제 완료로 바꾸지 못하게(감시 트리거)
-- 3) 승인 응답 200인데 완료가 아니면 실패가 아니라 「확인 필요」(자동 취소 안 됨)
-- 4) 다시 확인·승인에서 토스 응답의 주문번호·금액을 대조
-- 5) 확인 중(requested·unknown)인 결제는 새 결제 키로 덮어쓰지 않음, 승인 중복 방지 키는 결제 키마다
-- 6) 환불에 토스 잔액 대조(refundableAmount) — 앞 환불이 시간 초과로 기록만 되돌려졌을 때 다른 금액으로 두 번 환불되지 않게
-- 7) 결제됐는데 주문이 취소된 경우 표시 + 운영자 「남은 결제 금액 환불」
-- 8) 환불이 남은 결제가 있으면 시크릿 키를 바꾸거나 지우지 못하게
-- 9) 확인 중인 결제가 있으면 금액 줄이기(부분 취소)도 막음, 손님에게 보이는 문구 정리

-- ── 토스 호출: 남은 시간 안에서만 ──
create or replace function mall_builder_private.toss_call(p_secret text, p_method text, p_path text, p_body jsonb, p_idem text)
returns table (status integer, body jsonb) language plpgsql set search_path = '' as $$
declare
  r extensions.http_response;
  h extensions.http_header[];
  -- 이 요청(문장)이 시작된 뒤 지난 시간. 손님·운영자 요청은 8초에서 끊기므로 7초 안에 끝낸다
  v_used integer := (extract(epoch from (clock_timestamp() - statement_timestamp())) * 1000)::integer;
  v_timeout integer := least(6000, 7000 - v_used);
begin
  if v_timeout < 1000 then raise exception 'toss_no_time'; end if;
  h := array[extensions.http_header('Authorization', 'Basic ' || replace(encode(convert_to(p_secret || ':', 'UTF8'), 'base64'), E'\n', ''))];
  if p_idem is not null then h := h || extensions.http_header('Idempotency-Key', p_idem); end if;
  perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT_MS', least(3000, v_timeout)::text);
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', v_timeout::text);
  select * into r from extensions.http((p_method, 'https://api.tosspayments.com' || p_path, h, 'application/json',
    case when p_body is null then null else p_body::text end)::extensions.http_request);
  return query select r.status,
    case when coalesce(r.content, '') ~ '^\s*[\{\[]' then r.content::jsonb else jsonb_build_object('raw', left(coalesce(r.content, ''), 200)) end;
end;
$$;

-- ── 환불: 토스 잔액이 우리 기록과 같을 때만(refundableAmount) ──
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
      jsonb_build_object('cancelReason', left(coalesce(nullif(btrim(p_reason), ''), '주문 취소'), 200), 'cancelAmount', p_amount, 'refundableAmount', v_left), p_idem) t;
  exception when others then
    raise exception '카드사 응답이 늦어 취소하지 않았습니다. 「결제 다시 확인」으로 환불 기록을 맞춘 뒤 같은 버튼을 다시 눌러 주세요.';
  end;
  if v_status <> 200 then
    raise exception '카드 환불이 되지 않아 취소하지 않았습니다: %. 「결제 다시 확인」으로 카드사 기록을 확인해 주세요.', coalesce(v_body ->> 'message', v_status::text);
  end if;
  update public.mall_builder_card_payments set
    canceled_amount = canceled_amount + p_amount,
    status = case when canceled_amount + p_amount >= amount then 'canceled' else 'partial_canceled' end,
    error = '',
    updated_at = now()
  where id = cp.id;
end;
$$;

-- ── 결제 설정 저장: 환불이 남은 결제가 있으면 시크릿 키를 바꾸거나 지우지 못함(옛 키로만 환불할 수 있다) ──
create or replace function public.mall_builder_payment_save(p_store_id uuid, p_client_key text, p_enabled boolean, p_secret_key text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_client text := btrim(coalesce(p_client_key, '')); v_secret text; v_old text; v_mode_c text; v_mode_s text; v_open integer;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if v_client <> '' and v_client !~ '^(test|live)_gck_[A-Za-z0-9_]{6,100}$' then raise exception '클라이언트 키는 결제위젯 키(test_gck_ 또는 live_gck_로 시작)를 넣어 주세요.'; end if;
  if p_secret_key is not null and btrim(p_secret_key) <> '' and btrim(p_secret_key) !~ '^(test|live)_gsk_[A-Za-z0-9_]{6,100}$' then
    raise exception '시크릿 키는 결제위젯 시크릿 키(test_gsk_ 또는 live_gsk_로 시작)를 넣어 주세요.';
  end if;
  select x.toss_secret_key into v_old from public.mall_builder_store_scheduler_secrets x where x.store_id = p_store_id;
  if p_secret_key is not null and coalesce(v_old, '') <> '' and btrim(p_secret_key) is distinct from v_old then
    select count(*) into v_open from public.mall_builder_card_payments cp
     where cp.store_id = p_store_id
       and (cp.status in ('requested', 'unknown') or (cp.status in ('done', 'partial_canceled') and cp.amount > cp.canceled_amount));
    if v_open > 0 then
      raise exception '환불이 남은 카드 결제가 %건 있어 시크릿 키를 바꾸거나 지울 수 없습니다(그 결제는 지금 키로만 환불됩니다). 모두 끝난 뒤 바꿔 주세요.', v_open;
    end if;
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

-- ── 손님 승인 ──
create or replace function public.mall_builder_card_confirm(p_order_id uuid, p_payment_key text, p_amount bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_secret text;
  v_pay uuid;
  v_status integer;
  v_body jsonb;
  v_existing text;
  v_done boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  -- 잠금을 오래 기다리면 토스에 쓸 시간이 모자라므로 1초만 기다린다(그 전에는 토스를 부르지 않았으니 다시 시도해도 안전)
  perform set_config('lock_timeout', '1000', true);
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found or o.user_id is distinct from auth.uid() then raise exception '주문을 찾을 수 없습니다.'; end if;
  if not o.is_card then raise exception '카드 결제 주문이 아닙니다.'; end if;
  select cp.status into v_existing from public.mall_builder_card_payments cp where cp.order_id = o.id for update;
  if v_existing in ('done', 'partial_canceled', 'canceled') then return jsonb_build_object('ok', true, 'already', true); end if;
  -- 확인 중인 결제는 새 결제 키로 덮어쓰지 않는다(먼저 들어온 결제가 실제로 됐을 수 있음)
  if v_existing in ('requested', 'unknown') then
    return jsonb_build_object('ok', false, 'unknown', true, 'message', '앞서 한 결제를 확인하고 있습니다. 주문 상세에서 「결제 확인하기」를 눌러 주세요.');
  end if;
  if o.status <> 'pending_payment' then raise exception '결제할 수 없는 주문입니다(지금 상태: %).', o.status; end if;
  if p_amount is distinct from o.total then raise exception '결제 금액(%원)이 주문 금액(%원)과 달라 승인하지 않았습니다.', p_amount, o.total; end if;
  if coalesce(p_payment_key, '') !~ '^[A-Za-z0-9_-]{10,200}$' then raise exception '결제 정보가 올바르지 않습니다.'; end if;
  select x.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  if coalesce(v_secret, '') = '' then raise exception '이 몰의 카드 결제 설정이 없습니다.'; end if;
  -- 토스에 쓸 시간(최소 2.5초)이 없으면 부르지 않고 멈춘다 — 이 경우 아직 결제 승인 전이라 돈이 나가지 않는다
  if (extract(epoch from (clock_timestamp() - statement_timestamp())) * 1000) > 4500 then
    raise exception '서버가 바빠 결제를 승인하지 못했습니다(결제는 되지 않았습니다). 이 화면을 새로고침해 주세요.';
  end if;

  insert into public.mall_builder_card_payments (store_id, order_id, payment_key, amount, status)
  values (o.store_id, o.id, p_payment_key, o.total, 'requested')
  on conflict (order_id) do update set payment_key = excluded.payment_key, amount = excluded.amount, status = 'requested', error = '', updated_at = now()
  returning id into v_pay;

  begin
    select t.status, t.body into v_status, v_body from mall_builder_private.toss_call(v_secret, 'POST', '/v1/payments/confirm',
      jsonb_build_object('paymentKey', p_payment_key, 'orderId', o.id::text, 'amount', o.total), 'confirm-' || p_payment_key) t;
  exception when others then
    update public.mall_builder_card_payments set status = 'unknown', error = left(sqlerrm, 300), updated_at = now() where id = v_pay;
    return jsonb_build_object('ok', false, 'unknown', true, 'message', '카드사 응답이 늦어 결제 결과를 아직 모릅니다. 주문 상세에서 「결제 확인하기」를 눌러 주세요.');
  end;

  v_done := v_status = 200 and v_body ->> 'status' = 'DONE'
            and v_body ->> 'orderId' = o.id::text and (v_body ->> 'totalAmount')::bigint = o.total;
  if v_done then
    update public.mall_builder_card_payments set status = 'done', method = coalesce(v_body ->> 'method', ''),
      approved_at = (v_body ->> 'approvedAt')::timestamptz, receipt_url = coalesce(v_body #>> '{receipt,url}', ''), error = '', updated_at = now()
    where id = v_pay;
    update public.mall_builder_orders set status = 'paid', pay_deadline_at = null, updated_at = now() where id = o.id;
    insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
    values (o.id, 'pending_payment', 'paid', auth.uid(), 'customer', '카드 결제 완료' || coalesce('(' || nullif(v_body ->> 'method', '') || ')', ''));
    return jsonb_build_object('ok', true);
  end if;
  -- 4xx만 「실패」(토스가 거절 — 돈이 나가지 않음). 200인데 완료가 아님·5xx·그 밖은 「확인 필요」(자동 취소되지 않음)
  update public.mall_builder_card_payments set
    status = case when v_status between 400 and 499 then 'failed' else 'unknown' end,
    error = left(btrim(coalesce(v_body ->> 'code', '') || ' ' || coalesce(v_body ->> 'message', '') ||
                 case when v_status = 200 then ' (토스 상태 ' || coalesce(v_body ->> 'status', '?') || ')' else '' end), 300),
    updated_at = now()
  where id = v_pay;
  return jsonb_build_object('ok', false, 'unknown', not (v_status between 400 and 499),
    'message', case when v_status between 400 and 499 then coalesce(v_body ->> 'message', '결제를 승인하지 못했습니다.')
                    else '결제 결과를 아직 확인하지 못했습니다. 주문 상세에서 「결제 확인하기」를 눌러 주세요.' end);
end;
$$;

-- ── 운영자 카드 주문 취소·반품 승인(0028과 같음 + 잠금 대기 1초) ──
create or replace function public.mall_builder_card_cancel_order(p_order_id uuid, p_to text, p_note text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_left bigint;
  v_done bigint;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  perform set_config('lock_timeout', '1000', true);
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

-- ── 운영자 카드 주문 부분 취소(0028 + 기록 문구 「카드 환불」·잠금 대기 1초) ──
create or replace function public.mall_builder_card_cancel_items(p_order_id uuid, p_items jsonb, p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_after bigint;
  v_res jsonb;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  perform set_config('lock_timeout', '1000', true);
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
  -- 0021이 남긴 기록의 「(환불할 금액 …)」은 무통장 문구 — 카드는 이미 환불됐으므로 「(카드 환불 …)」로
  update public.mall_builder_order_events e set note = replace(e.note, ' (환불할 금액 ', ' (카드 환불 ')
   where e.id = (select e2.id from public.mall_builder_order_events e2 where e2.order_id = o.id order by e2.created_at desc, e2.id desc limit 1)
     and e.note like '부분 취소:%';
  return coalesce(v_res, '{}'::jsonb) || jsonb_build_object('refunded', o.total - v_after);
end;
$$;

-- ── 다시 확인: 운영자 또는 그 주문의 손님. 토스 응답의 주문번호·금액을 대조하고, 어긋난 상태는 고치지 않고 표시 ──
create or replace function public.mall_builder_card_recheck(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  cp public.mall_builder_card_payments%rowtype;
  v_secret text;
  v_status integer;
  v_body jsonb;
  v_st text;
  v_staff boolean;
  v_match boolean;
  v_toss_canceled bigint;
  v_note text := '';
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  perform set_config('lock_timeout', '1000', true);
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found then raise exception '주문을 찾을 수 없습니다.'; end if;
  v_staff := public.mall_builder_is_store_staff(o.store_id);
  if not v_staff and o.user_id is distinct from auth.uid() then raise exception '주문을 찾을 수 없습니다.'; end if;
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
  -- 이 주문의 결제가 맞는지(다른 주문의 결제 키가 들어온 경우를 막음)
  v_match := v_body ->> 'orderId' = o.id::text and (v_body ->> 'totalAmount')::bigint = cp.amount;
  if not v_match then
    update public.mall_builder_card_payments set error = '토스 기록의 주문번호·금액이 이 주문과 다릅니다 — 확인 필요', updated_at = now() where id = cp.id;
    return jsonb_build_object('toss_status', v_st, 'mismatch', true);
  end if;
  v_toss_canceled := cp.amount - coalesce((v_body ->> 'balanceAmount')::bigint, cp.amount);

  if v_st = 'DONE' and cp.status in ('requested', 'unknown', 'failed') then
    update public.mall_builder_card_payments set status = 'done', method = coalesce(v_body ->> 'method', ''),
      approved_at = (v_body ->> 'approvedAt')::timestamptz, receipt_url = coalesce(v_body #>> '{receipt,url}', ''), error = '', updated_at = now()
    where id = cp.id;
    if o.status = 'pending_payment' and cp.amount = o.total then
      update public.mall_builder_orders set status = 'paid', pay_deadline_at = null, updated_at = now() where id = o.id;
      insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
      values (o.id, 'pending_payment', 'paid', auth.uid(), case when v_staff then 'staff' else 'customer' end, '카드 결제 다시 확인 — 결제 완료');
    else
      -- 결제는 됐는데 주문이 이미 취소됐거나 금액이 다르다 → 운영자가 환불해야 한다
      update public.mall_builder_card_payments set error = '결제는 됐지만 주문이 ' || o.status || ' 상태입니다 — 「남은 결제 금액 환불」이 필요합니다', updated_at = now() where id = cp.id;
      v_note := 'refund_needed';
    end if;
  elsif v_st in ('ABORTED', 'EXPIRED') and cp.status in ('requested', 'unknown') then
    update public.mall_builder_card_payments set status = 'failed', error = '토스 상태 ' || v_st || '(결제되지 않음)', updated_at = now() where id = cp.id;
  elsif v_st in ('CANCELED', 'PARTIAL_CANCELED') and v_toss_canceled <> cp.canceled_amount then
    -- 토스에서 더(또는 덜) 환불돼 있다(콘솔에서 직접 취소, 응답이 늦어 기록이 되돌려진 환불 등) — 숫자는 고치지 않고 표시
    update public.mall_builder_card_payments set
      error = '토스 환불 합계 ' || to_char(v_toss_canceled, 'FM999,999,999,990') || '원 · 우리 기록 ' || to_char(cp.canceled_amount, 'FM999,999,999,990') || '원 — 기록이 다릅니다. 확인 필요',
      updated_at = now()
    where id = cp.id;
    v_note := 'refund_mismatch';
  elsif v_st in ('IN_PROGRESS', 'READY', 'WAITING_FOR_DEPOSIT') and cp.status in ('requested', 'unknown') then
    update public.mall_builder_card_payments set error = '토스 상태 ' || v_st || ' — 아직 결제가 끝나지 않았습니다', updated_at = now() where id = cp.id;
  end if;
  return jsonb_build_object('toss_status', v_st, 'note', v_note);
end;
$$;

-- ── 운영자: 결제는 됐는데 취소·반품으로 끝난 주문의 남은 결제 금액 환불 ──
create or replace function public.mall_builder_card_refund_remaining(p_order_id uuid, p_note text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  cp public.mall_builder_card_payments%rowtype;
  v_left bigint;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  perform set_config('lock_timeout', '1000', true);
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if not found or not public.mall_builder_is_store_staff(o.store_id) then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  if not o.is_card then raise exception '카드 결제 주문이 아닙니다.'; end if;
  if o.status not in ('cancelled', 'returned') then raise exception '취소·반품으로 끝난 주문만 이 방법으로 환불합니다. 진행 중인 주문은 「주문 취소」를 써 주세요.'; end if;
  select * into cp from public.mall_builder_card_payments where order_id = o.id;
  if not found or cp.status not in ('done', 'partial_canceled') then raise exception '환불할 카드 결제가 없습니다.'; end if;
  v_left := cp.amount - cp.canceled_amount;
  if v_left <= 0 then raise exception '남은 결제 금액이 없습니다.'; end if;
  perform mall_builder_private.card_refund(o.id, v_left, coalesce(nullif(btrim(p_note), ''), '취소된 주문 환불'), 'remaining-' || o.id || '-' || cp.canceled_amount);
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (o.id, o.status, o.status, auth.uid(), 'staff', '남은 카드 결제 ' || to_char(v_left, 'FM999,999,999,990') || '원 환불');
  return '남은 카드 결제 ' || to_char(v_left, 'FM999,999,999,990') || '원을 환불했습니다.';
end;
$$;
revoke all on function public.mall_builder_card_refund_remaining(uuid, text) from public, anon;
grant execute on function public.mall_builder_card_refund_remaining(uuid, text) to authenticated;

-- ── 감시 트리거: 결제가 끝나지 않은 카드 주문은 결제 완료·배송으로 못 넘어가고, 확인 중이면 금액도 못 줄인다 ──
create or replace function public.mall_builder_orders_card_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pay text;
begin
  if not old.is_card or current_setting('mall_builder.card_refund', true) = 'on' then return new; end if;
  select cp.status into v_pay from public.mall_builder_card_payments cp where cp.order_id = old.id;
  if old.status = 'pending_payment' and new.status not in ('pending_payment', 'cancelled') and v_pay is distinct from 'done' then
    raise exception '카드 결제가 끝나지 않은 주문입니다. 카드 주문은 손님이 결제창에서 결제하면 자동으로 「결제 완료」가 됩니다.';
  end if;
  if new.status in ('cancelled', 'returned') and old.status not in ('cancelled', 'returned') then
    if v_pay in ('requested', 'unknown') then raise exception '카드 결제를 확인하고 있어 지금은 취소할 수 없습니다. 「결제 확인하기」를 먼저 눌러 주세요.'; end if;
    if v_pay in ('done', 'partial_canceled') then raise exception '카드 결제 주문은 「카드 환불과 함께 취소」로 처리해 주세요.'; end if;
  end if;
  if new.total < old.total and v_pay in ('done', 'partial_canceled', 'requested', 'unknown') then
    raise exception '카드 결제 주문의 부분 취소는 카드 환불과 함께 처리해 주세요(결제 확인 중이면 먼저 확인).';
  end if;
  return new;
end;
$$;
