-- 0104 교환비 카드 결제(M2-12b b3 단계1) — 2026-11-17 번호 정리로 0103→0104(Master msg_abc5861bd197, 미적용 원문 이름만 변경). 선행 0103_exchange_confirmed_window(교환 가능 상태 helper) — PLAN_20261117_M2_12B3_EXCHANGE_FEE_PAY.md, Master msg_7cd50401383d
-- 주인님 결정 D5(교환비 = 개인결제창(토스) + 무통장, 결제 확인 전 재발송 없음). Master 확정: E1 카드 결제 뒤 거절 막기(자동 환불 미구현),
-- E2 로그인한 본인 주문만, E3 카드 미설정 몰은 무통장만(화면), E4 유저 결제 화면은 새 폴더(단계2).
-- 틀: 주문 카드 결제 승인 0029 mall_builder_card_confirm·card_recheck와 같음(토스 비밀 키는 DB 안에서만, 잠금 대기 1초,
--     확인 중 결제 덮어쓰기 금지, 시간 모자라면 토스 안 부름, 4xx만 실패·그 밖은 확인 필요, 응답 주문 번호·금액 대조, 자동 재결제 없음).
-- 잠금 순서: 주문 → 교환 → 교환비 결제(0102 lock_exchange와 같은 순서). 결제 키는 이력·화면에 남기지 않는다(칸 권한으로 읽기 막음).
-- 선행: 0102(교환 표·exchange_event·exchange_order_delivered·lock_exchange), 0029(toss_call).

create table if not exists public.mall_builder_exchange_fee_payments (
  id uuid primary key default gen_random_uuid(),
  exchange_id uuid not null unique references public.mall_builder_exchanges (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  order_id uuid not null references public.mall_builder_orders (id) on delete cascade,
  toss_order_id text not null unique check (toss_order_id ~ '^exfee-[0-9a-f-]{36}$'),
  payment_key text not null default '',
  amount bigint not null check (amount > 0),
  -- requested 승인 요청 중 · done 결제 완료 · failed 실패(돈 안 나감) · unknown 결과 불확실(다시 확인 필요) · canceled 취소(다음 단위)
  status text not null default 'requested' check (status in ('requested', 'done', 'failed', 'unknown', 'canceled')),
  method text not null default '',
  approved_at timestamptz,
  receipt_url text not null default '',
  error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_exchange_fee_payments_order on public.mall_builder_exchange_fee_payments (order_id);

alter table public.mall_builder_exchange_fee_payments enable row level security;
drop policy if exists mall_builder_exchange_fee_payments_read on public.mall_builder_exchange_fee_payments;
create policy mall_builder_exchange_fee_payments_read on public.mall_builder_exchange_fee_payments for select to authenticated
  using (
    public.mall_builder_staff_can(store_id, 'orders')
    or exists (select 1 from public.mall_builder_orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );
-- 쓰기는 함수로만. 읽기도 결제 키 칸은 빼고 허용(화면·API에 결제 키가 나가지 않게)
revoke all on public.mall_builder_exchange_fee_payments from anon, authenticated;
grant select (id, exchange_id, store_id, order_id, toss_order_id, amount, status, method, approved_at, receipt_url, error, created_at, updated_at)
  on public.mall_builder_exchange_fee_payments to authenticated;

-- ── 교환 지킴: 카드 결제가 요청·확인 중·완료면 교환비 금액 변경·거절을 막고, 「입금 확인(paid)」 전이는 검증된 결제 기록으로만 판단 ──
-- (0102 함수 재정의 없이 모든 경로. 세션 설정값 등 바꿀 수 있는 표시에 기대지 않음 — Master msg_cf68fc58d223)
--  · 요청 중(requested)·불확실(unknown) 카드 결제가 있으면 paid 전이 금지(무통장 수동 확인 경합 차단)
--  · 완료(done) 카드 결제가 있으면 그 결제 금액 = 교환비일 때만 paid 허용(카드 승인·다시 확인 경로). 무통장 확인 함수는 이미 paid라 「대기 없음」으로 막힘
--  · 카드 결제가 없거나 실패(failed)·취소(canceled)뿐이면 기존 무통장 흐름 그대로
create or replace function mall_builder_private.exchanges_fee_card_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_active boolean; v_pending boolean; v_done_ok boolean;
begin
  select bool_or(p.status in ('requested', 'unknown', 'done')), bool_or(p.status in ('requested', 'unknown')),
         bool_or(p.status = 'done' and p.amount = old.fee)
    into v_active, v_pending, v_done_ok
    from public.mall_builder_exchange_fee_payments p where p.exchange_id = new.id;
  if coalesce(v_active, false) then
    if new.fee is distinct from old.fee then
      raise exception '카드 결제가 진행 중이거나 끝난 교환비는 바꿀 수 없습니다.';
    end if;
    if new.step = 'rejected' and old.step is distinct from 'rejected' then
      raise exception '카드로 결제했거나 결제 확인 중인 교환비가 있어 거절할 수 없습니다. 카드 결제 취소가 먼저 필요하니 쇼핑몰 관리자(대표 운영사)에게 문의해 주세요(자동 환불은 아직 지원하지 않습니다).';
    end if;
  end if;
  if new.fee_status = 'paid' and old.fee_status is distinct from 'paid' then
    if coalesce(v_pending, false) then
      raise exception '카드 결제를 확인하는 중이라 입금 확인을 할 수 없습니다(이중 수납 방지). 먼저 「카드 결제 다시 확인」을 해 주세요.';
    end if;
    if coalesce(v_active, false) and not coalesce(v_done_ok, false) then
      raise exception '카드 결제 기록과 교환비가 맞지 않아 입금 확인을 할 수 없습니다.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function mall_builder_private.exchanges_fee_card_guard() from public;
drop trigger if exists mall_builder_exchanges_fee_card_guard on public.mall_builder_exchanges;
create trigger mall_builder_exchanges_fee_card_guard before update on public.mall_builder_exchanges
  for each row execute function mall_builder_private.exchanges_fee_card_guard();

-- 카드 결제 완료를 교환에 반영(결제 기록을 done으로 먼저 바꾼 뒤 부른다 — 지킴 트리거가 그 기록·금액으로 허용)
create or replace function mall_builder_private.exchange_fee_mark_card_paid(p_exchange_id uuid, p_method text, p_role text)
returns void language plpgsql set search_path = '' as $$
declare x public.mall_builder_exchanges%rowtype;
begin
  select * into x from public.mall_builder_exchanges where id = p_exchange_id;
  if x.fee_status <> 'waiting' then return; end if;
  update public.mall_builder_exchanges set fee_status = 'paid', fee_paid_at = now(), updated_at = now() where id = p_exchange_id;
  perform mall_builder_private.exchange_event(x.order_id, p_role, '교환비 ' || x.fee || '원 카드 결제 완료' || coalesce('(' || nullif(p_method, '') || ')', ''));
end;
$$;
revoke all on function mall_builder_private.exchange_fee_mark_card_paid(uuid, text, text) from public;

-- ── 유저(본인 주문): 교환비 카드 결제 승인 — 결제창 성공 주소에서 부른다 ──
create or replace function public.mall_builder_exchange_fee_card_confirm(p_exchange_id uuid, p_payment_key text, p_amount bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order uuid; o public.mall_builder_orders%rowtype; x public.mall_builder_exchanges%rowtype;
  v_existing text; v_secret text; v_pay uuid; v_toss text; v_status integer; v_body jsonb; v_done boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  -- 잠금을 오래 기다리면 토스에 쓸 시간이 모자라므로 1초만(그 전에는 토스를 부르지 않았으니 다시 시도해도 안전)
  perform set_config('lock_timeout', '1000', true);
  select e.order_id into v_order from public.mall_builder_exchanges e where e.id = p_exchange_id;
  if v_order is null then raise exception '교환을 찾을 수 없습니다.'; end if;
  select * into o from public.mall_builder_orders where id = v_order for update;
  if not found or o.user_id is distinct from auth.uid() then raise exception '교환을 찾을 수 없습니다.'; end if;
  select * into x from public.mall_builder_exchanges where id = p_exchange_id for update;
  if not found or x.order_id <> o.id then raise exception '교환을 찾을 수 없습니다.'; end if;
  select p.status into v_existing from public.mall_builder_exchange_fee_payments p where p.exchange_id = x.id for update;
  if v_existing = 'done' then return jsonb_build_object('ok', true, 'already', true); end if;
  -- 확인 중인 결제는 새 결제 키로 덮어쓰지 않는다(먼저 들어온 결제가 실제로 됐을 수 있음) — 자동 재결제 없음
  if v_existing in ('requested', 'unknown') then
    return jsonb_build_object('ok', false, 'unknown', true, 'message', '앞서 한 교환비 결제를 확인하고 있습니다. 쇼핑몰이 확인한 뒤 안내합니다.');
  end if;
  if v_existing = 'canceled' then raise exception '취소된 교환비 결제입니다. 쇼핑몰에 문의해 주세요.'; end if;
  if not mall_builder_private.exchange_order_status_ok(o.status) then raise exception '주문이 배송 완료(구매 확정 포함) 상태가 아니라 교환비를 결제할 수 없습니다.'; end if;
  if x.step not in ('requested', 'collecting', 'collected') then raise exception '교환비를 결제할 수 있는 단계가 아닙니다.'; end if;
  -- 무통장 입금이 먼저 확인됐으면 토스를 부르지 않는다(이중 수납 방지 — 승인 전이라 카드 돈은 나가지 않음)
  if x.fee <= 0 or x.fee_status <> 'waiting' then raise exception '결제를 기다리는 교환비가 없습니다(이미 입금이 확인됐거나 교환비가 없습니다).'; end if;
  if p_amount is distinct from x.fee then raise exception '결제 금액(%원)이 교환비(%원)와 달라 승인하지 않았습니다.', p_amount, x.fee; end if;
  if coalesce(p_payment_key, '') !~ '^[A-Za-z0-9_-]{10,200}$' then raise exception '결제 정보가 올바르지 않습니다.'; end if;
  select s.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets s where s.store_id = o.store_id;
  if coalesce(v_secret, '') = '' then raise exception '이 몰의 카드 결제 설정이 없습니다.'; end if;
  if (extract(epoch from (clock_timestamp() - statement_timestamp())) * 1000) > 4500 then
    raise exception '서버가 바빠 결제를 승인하지 못했습니다(결제는 되지 않았습니다). 새로고침해 주세요.';
  end if;

  v_toss := 'exfee-' || x.id::text;
  insert into public.mall_builder_exchange_fee_payments (exchange_id, store_id, order_id, toss_order_id, payment_key, amount, status)
  values (x.id, o.store_id, o.id, v_toss, p_payment_key, x.fee, 'requested')
  on conflict (exchange_id) do update set payment_key = excluded.payment_key, amount = excluded.amount, status = 'requested', error = '', updated_at = now()
  returning id into v_pay;

  begin
    select t.status, t.body into v_status, v_body from mall_builder_private.toss_call(v_secret, 'POST', '/v1/payments/confirm',
      jsonb_build_object('paymentKey', p_payment_key, 'orderId', v_toss, 'amount', x.fee), 'exfee-confirm-' || p_payment_key) t;
  exception when others then
    update public.mall_builder_exchange_fee_payments set status = 'unknown', error = left(sqlerrm, 300), updated_at = now() where id = v_pay;
    return jsonb_build_object('ok', false, 'unknown', true, 'message', '카드사 응답이 늦어 결제 결과를 아직 모릅니다. 쇼핑몰이 확인한 뒤 안내합니다.');
  end;

  -- 토스 응답을 받은 뒤의 처리(해석·결제 기록·교환 반영)는 안쪽 블록에서 — 여기서 오류가 나도 위 결제 기록(결제 키 포함)은 남기고
  -- unknown으로 바꿔 직원 다시 확인으로 복구한다(QA012: 토스 DONE 뒤 내부 오류로 기록·키가 통째로 되돌려지던 문제).
  -- 한계: 이 블록은 「함수 안에서 난 오류」만 막는다. 응답 뒤 DB 연결 끊김·문장 시간 초과·서버 중단은 이 기록까지 되돌린다(외부 원자성 아님).
  begin
    -- 금액은 숫자 형식일 때만 변환(아니면 완료 판정 불가 = unknown, 기본값으로 채우지 않음). 승인 시각 변환 실패도 아래 예외 → unknown
    v_done := v_status = 200 and v_body ->> 'status' = 'DONE' and v_body ->> 'orderId' = v_toss
              and coalesce(v_body ->> 'totalAmount', '') ~ '^[0-9]{1,12}$' and (v_body ->> 'totalAmount')::bigint = x.fee;
    if v_done then
      update public.mall_builder_exchange_fee_payments set status = 'done', method = coalesce(v_body ->> 'method', ''),
        approved_at = case when coalesce(v_body ->> 'approvedAt', '') = '' then null else (v_body ->> 'approvedAt')::timestamptz end,
        receipt_url = coalesce(v_body #>> '{receipt,url}', ''), error = '', updated_at = now()
      where id = v_pay;
      perform mall_builder_private.exchange_fee_mark_card_paid(x.id, v_body ->> 'method', 'customer');
      return jsonb_build_object('ok', true);
    end if;
    update public.mall_builder_exchange_fee_payments set
      status = case when v_status between 400 and 499 then 'failed' else 'unknown' end,
      error = left(btrim(coalesce(v_body ->> 'code', '') || ' ' || coalesce(v_body ->> 'message', '') ||
                   case when v_status = 200 then ' (토스 상태 ' || coalesce(v_body ->> 'status', '?') || ')' else '' end), 300),
      updated_at = now()
    where id = v_pay;
    return jsonb_build_object('ok', false, 'unknown', not (v_status between 400 and 499),
      'message', case when v_status between 400 and 499 then coalesce(v_body ->> 'message', '결제를 승인하지 못했습니다.')
                      else '결제 결과를 아직 확인하지 못했습니다. 쇼핑몰이 확인한 뒤 안내합니다.' end);
  exception when others then
    -- 안쪽 변경만 되돌려짐. 결제 기록은 남아 있으니 unknown + 사유로 바꾼다(실패로 돌려 재결제를 허용하지 않음)
    update public.mall_builder_exchange_fee_payments set status = 'unknown',
      error = left('토스 응답 처리 중 오류(관리자 확인 필요): ' || sqlerrm, 300), updated_at = now()
    where id = v_pay;
    return jsonb_build_object('ok', false, 'unknown', true, 'message', '결제 결과를 처리하는 중 문제가 생겼습니다. 쇼핑몰이 확인한 뒤 안내합니다(다시 결제하지 마세요).');
  end;
end;
$$;

-- ── 운영사(주문 권한): 확인 중인 교환비 카드 결제를 토스에서 다시 확인 ──
create or replace function public.mall_builder_exchange_fee_card_recheck(p_exchange_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare x public.mall_builder_exchanges%rowtype; p public.mall_builder_exchange_fee_payments%rowtype; v_secret text; v_status integer; v_body jsonb; v_st text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  perform set_config('lock_timeout', '1000', true);
  x := mall_builder_private.lock_exchange(p_exchange_id); -- 권한 확인 + 주문 → 교환 잠금
  select * into p from public.mall_builder_exchange_fee_payments where exchange_id = x.id for update;
  if not found or p.payment_key = '' then raise exception '결제창에서 돌아온 기록이 없어 확인할 수 없습니다(결제되지 않은 것으로 보입니다).'; end if;
  if p.status in ('done', 'canceled') then return jsonb_build_object('toss_status', null, 'status', p.status); end if;
  select s.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets s where s.store_id = x.store_id;
  if coalesce(v_secret, '') = '' then raise exception '카드 결제 키가 없습니다.'; end if;
  begin
    select t.status, t.body into v_status, v_body from mall_builder_private.toss_call(v_secret, 'GET', '/v1/payments/' || p.payment_key, null, null) t;
  exception when others then
    raise exception '카드사에 연결하지 못했습니다. 잠시 뒤 다시 눌러 주세요.';
  end;
  if v_status <> 200 then raise exception '확인하지 못했습니다: %', coalesce(v_body ->> 'message', v_status::text); end if;
  v_st := v_body ->> 'status';
  -- 조회 응답 처리도 안쪽 블록에서(오류면 결제 기록을 unknown·사유로 남기고 직원에게 알림 — 실패로 돌려 재결제를 허용하지 않음)
  begin
    if v_st = 'DONE' and v_body ->> 'orderId' = p.toss_order_id
       and coalesce(v_body ->> 'totalAmount', '') ~ '^[0-9]{1,12}$' and (v_body ->> 'totalAmount')::bigint = p.amount then
      update public.mall_builder_exchange_fee_payments set status = 'done', method = coalesce(v_body ->> 'method', ''),
        approved_at = case when coalesce(v_body ->> 'approvedAt', '') = '' then null else (v_body ->> 'approvedAt')::timestamptz end,
        receipt_url = coalesce(v_body #>> '{receipt,url}', ''), error = '', updated_at = now()
      where id = p.id;
      perform mall_builder_private.exchange_fee_mark_card_paid(x.id, v_body ->> 'method', 'staff');
    elsif v_st = 'DONE' then
      update public.mall_builder_exchange_fee_payments set status = 'unknown', error = '토스 결제 정보(주문 번호·금액)가 교환비와 다릅니다 — 관리자 확인 필요', updated_at = now() where id = p.id;
    elsif v_st in ('ABORTED', 'EXPIRED', 'CANCELED') then
      update public.mall_builder_exchange_fee_payments set status = 'failed', error = '토스 상태 ' || v_st, updated_at = now() where id = p.id;
    end if;
  exception when others then
    update public.mall_builder_exchange_fee_payments set status = 'unknown',
      error = left('토스 조회 응답 처리 중 오류(관리자 확인 필요): ' || sqlerrm, 300), updated_at = now()
    where id = p.id;
    return jsonb_build_object('toss_status', v_st, 'error', '토스 응답을 처리하지 못했습니다. 결제는 「확인 필요」로 남겼습니다.');
  end;
  return jsonb_build_object('toss_status', v_st);
end;
$$;

revoke all on function public.mall_builder_exchange_fee_card_confirm(uuid, text, bigint) from public, anon;
grant execute on function public.mall_builder_exchange_fee_card_confirm(uuid, text, bigint) to authenticated;
revoke all on function public.mall_builder_exchange_fee_card_recheck(uuid) from public, anon;
grant execute on function public.mall_builder_exchange_fee_card_recheck(uuid) to authenticated;
