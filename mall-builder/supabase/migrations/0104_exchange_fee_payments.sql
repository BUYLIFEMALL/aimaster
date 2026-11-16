-- 0104 교환비 카드 결제(M2-12b b3 단계1) — 2026-11-17 번호 정리로 0103→0104(Master msg_abc5861bd197, 미적용 원문 이름만 변경). 선행 0103_exchange_confirmed_window(교환 가능 상태 helper) — PLAN_20261117_M2_12B3_EXCHANGE_FEE_PAY.md, Master msg_7cd50401383d
-- 주인님 결정 D5(교환비 = 개인결제창(토스) + 무통장, 결제 확인 전 재발송 없음). Master 확정: E1 카드 결제 뒤 거절 막기(자동 환불 미구현),
-- E2 로그인한 본인 주문만, E3 카드 미설정 몰은 무통장만(화면), E4 유저 결제 화면은 새 폴더(단계2).
-- 틀: 주문 카드 결제 승인 0029 mall_builder_card_confirm·card_recheck와 같음(토스 비밀 키는 DB 안에서만, 잠금 대기 1초,
--     확인 중 결제 덮어쓰기 금지, 시간 모자라면 토스 안 부름, 4xx만 실패·그 밖은 확인 필요, 응답 주문 번호·금액 대조, 자동 재결제 없음).
-- 잠금 순서: 주문 → 교환 → 교환비 결제(0102 lock_exchange와 같은 순서). 결제 키는 이력·화면에 남기지 않는다(칸 권한으로 읽기 막음).
-- 선행: 0102(교환 표·exchange_event·exchange_order_delivered·lock_exchange), 0029(toss_call).
-- 두 단계(2026-11-17, PLAN_20261117_M2_12B3_EXCHANGE_FEE_PAY 7절, Master msg_02fc9d3c39ac·msg_e4cc90983f45):
--   1) card_prepare: 외부 호출 없이 결제 키·금액·토스 주문 번호·멱등키와 처음 준비 시각을 고정해 「prepared」로 커밋(별도 요청 = 별도 트랜잭션).
--      같은 키로 다시 불러도 시각·키·시한을 바꾸지 않음. 다른 키는 앞 기록이 failed일 때만 교체.
--   2) card_confirm: prepared이고 같은 결제 키이며 처음 준비 뒤 30분 안일 때만 토스 승인 POST(본문·멱등키 = 준비 때 고정값).
--      requested·unknown이면 POST 0, 30분 지나면 POST 0(직원 다시 확인만). confirm이 강제 중단(연결 끊김·시간 초과)되면 prepared가 남고,
--      다시 confirm하면 같은 멱등키·같은 본문으로 다시 보냄 — 토스 문서상 같은 요청은 첫 응답을 돌려줌(15일). 외부 원자성 보장은 아님.
--   다시 확인(GET)은 prepared·requested·unknown 모두 대상, DONE·주문 번호·금액이 맞을 때만 완료, 404·연결 실패는 상태 그대로(해제 없음).

create table if not exists public.mall_builder_exchange_fee_payments (
  id uuid primary key default gen_random_uuid(),
  exchange_id uuid not null unique references public.mall_builder_exchanges (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  order_id uuid not null references public.mall_builder_orders (id) on delete cascade,
  toss_order_id text not null unique check (toss_order_id ~ '^exfee-[0-9a-f-]{36}$'),
  payment_key text not null default '',
  amount bigint not null check (amount > 0),
  -- prepared 준비 완료(키·금액 고정, 승인 전 또는 승인 도중 강제 중단으로 되돌아옴) · requested 승인 요청 중 · done 결제 완료
  -- · failed 실패(돈 안 나감) · unknown 결과 불확실(다시 확인 필요) · canceled 취소(다음 단위)
  status text not null default 'prepared' check (status in ('prepared', 'requested', 'done', 'failed', 'unknown', 'canceled')),
  -- 처음 준비한 시각(같은 키로 다시 준비해도 안 바뀜 — 30분 승인 시한의 기준), 승인 요청 시각, 토스 멱등키(준비 때 고정, 결제 키를 담으므로 읽기 권한 없음)
  prepared_at timestamptz not null default now(),
  requested_at timestamptz,
  idempotency_key text not null default '',
  -- 완료(done) 뒤 다시 확인에서 응답이 이 결제와 맞지 않거나·정상 DONE이 아니거나·연결/처리에 실패하면 켠다(원래 승인 증거는 그대로).
  -- 켜져 있으면 재발송 막힘(지킴 트리거). 끄는 길은 같은 결제 키·주문 번호·금액의 정확한 DONE을 실제 조회로 다시 확인했을 때뿐. 사유 글자(error)에 의존하지 않음
  needs_review boolean not null default false,
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
grant select (id, exchange_id, store_id, order_id, toss_order_id, amount, status, prepared_at, requested_at, needs_review, method, approved_at, receipt_url, error, created_at, updated_at)
  on public.mall_builder_exchange_fee_payments to authenticated;

-- ── 결제 시도 이력(추가만, 비공개) — Master msg_4ffc6cca7adb ──
-- 실패한 결제를 새 결제 키로 바꾸기 직전, 토스 취소로 보류할 때 그 순간의 결제 기록을 한 줄 그대로 남긴다(원래 승인 증거 포함).
-- 같은 키로 다시 준비·다시 승인하는 정상 재시도는 남기지 않는다. 회원·직원 정책·권한 0 — 함수(소유자 권한)만 쓴다.
-- 지우는 범위는 결제 기록과 같다(교환·주문이 지워지면 함께 — 기존 보관 정책 범위 안).
create table if not exists public.mall_builder_exchange_fee_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.mall_builder_exchange_fee_payments (id) on delete cascade,
  exchange_id uuid not null references public.mall_builder_exchanges (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  order_id uuid not null references public.mall_builder_orders (id) on delete cascade,
  toss_order_id text not null,
  payment_key text not null,
  idempotency_key text not null,
  amount bigint not null,
  status text not null,
  error text not null default '',
  method text not null default '',
  approved_at timestamptz,
  receipt_url text not null default '',
  prepared_at timestamptz,
  requested_at timestamptz,
  reason text not null check (reason in ('replaced_failed', 'toss_canceled', 'toss_partial_canceled')),
  archived_by uuid,
  archived_at timestamptz not null default now()
);
create index if not exists mall_builder_exchange_fee_payment_attempts_payment on public.mall_builder_exchange_fee_payment_attempts (payment_id);
alter table public.mall_builder_exchange_fee_payment_attempts enable row level security;
revoke all on public.mall_builder_exchange_fee_payment_attempts from public, anon, authenticated;

create or replace function mall_builder_private.exchange_fee_attempt_archive(p_payment_id uuid, p_reason text)
returns void language sql set search_path = '' as $$
  insert into public.mall_builder_exchange_fee_payment_attempts (payment_id, exchange_id, store_id, order_id, toss_order_id, payment_key, idempotency_key,
         amount, status, error, method, approved_at, receipt_url, prepared_at, requested_at, reason, archived_by)
  select p.id, p.exchange_id, p.store_id, p.order_id, p.toss_order_id, p.payment_key, p.idempotency_key,
         p.amount, p.status, p.error, p.method, p.approved_at, p.receipt_url, p.prepared_at, p.requested_at, p_reason, auth.uid()
    from public.mall_builder_exchange_fee_payments p where p.id = p_payment_id
$$;
revoke all on function mall_builder_private.exchange_fee_attempt_archive(uuid, text) from public;

-- ── 교환 지킴: 카드 결제가 요청·확인 중·완료면 교환비 금액 변경·거절을 막고, 「입금 확인(paid)」 전이는 검증된 결제 기록으로만 판단 ──
-- (0102 함수 재정의 없이 모든 경로. 세션 설정값 등 바꿀 수 있는 표시에 기대지 않음 — Master msg_cf68fc58d223)
--  · 준비(prepared)·요청 중(requested)·불확실(unknown) 카드 결제가 있으면 paid 전이 금지(무통장 수동 확인 경합 차단)
--  · 완료(done) 카드 결제가 있으면 그 결제 금액 = 교환비일 때만 paid 허용(카드 승인·다시 확인 경로). 무통장 확인 함수는 이미 paid라 「대기 없음」으로 막힘
--  · 카드 결제가 없거나 실패(failed)뿐이면 기존 무통장 흐름 그대로
--  · 토스 취소 보류(canceled)는 확인 필요와 같이 잠금(금액 변경·거절·입금 확인 0) — 관리자 문의
--  · 확인 필요(prepared·requested·unknown)·취소 보류가 있으면 재발송(reshipped) 전이도 막음
create or replace function mall_builder_private.exchanges_fee_card_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_active boolean; v_pending boolean; v_done_ok boolean;
begin
  select bool_or(p.status in ('prepared', 'requested', 'unknown', 'done', 'canceled')), bool_or(p.status in ('prepared', 'requested', 'unknown', 'canceled') or (p.status = 'done' and p.needs_review)),
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
  if new.step = 'reshipped' and old.step is distinct from 'reshipped' and coalesce(v_pending, false) then
    raise exception '카드 결제를 확인하는 중이거나 토스에서 취소된 교환비가 있어 재발송할 수 없습니다. 쇼핑몰 관리자(대표 운영사)에게 문의해 주세요.';
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

-- 토스가 취소(전체·부분)라고 확인한 결제를 보류로 잠근다: 그 순간 기록을 이력에 남기고(원래 승인 증거), 결제 기록 canceled,
-- 교환비는 「유효한 결제 없음」(paid였으면 waiting, 입금 시각 비움)으로 — 교환 단계·재고는 자동으로 되돌리지 않음. 이미 canceled면 아무것도 안 함(이력 중복 0)
create or replace function mall_builder_private.exchange_fee_card_hold_canceled(p_payment_id uuid, p_toss_status text)
returns void language plpgsql set search_path = '' as $$
declare p public.mall_builder_exchange_fee_payments%rowtype; x public.mall_builder_exchanges%rowtype; v_what text;
begin
  select * into p from public.mall_builder_exchange_fee_payments where id = p_payment_id;
  if p.id is null or p.status = 'canceled' then return; end if;
  v_what := case when p_toss_status = 'PARTIAL_CANCELED' then '부분 취소' else '취소' end;
  perform mall_builder_private.exchange_fee_attempt_archive(p.id, case when p_toss_status = 'PARTIAL_CANCELED' then 'toss_partial_canceled' else 'toss_canceled' end);
  update public.mall_builder_exchange_fee_payments set status = 'canceled',
    error = '토스에서 ' || v_what || '된 결제입니다 — 유효한 교환비 결제가 아니므로 쇼핑몰 관리자(대표 운영사) 확인이 필요합니다', updated_at = now()
  where id = p.id;
  select * into x from public.mall_builder_exchanges where id = p.exchange_id;
  if x.fee_status = 'paid' then
    update public.mall_builder_exchanges set fee_status = 'waiting', fee_paid_at = null, updated_at = now() where id = x.id;
  end if;
  perform mall_builder_private.exchange_event(x.order_id, 'staff', '교환비 카드 결제가 토스에서 ' || v_what || '됨 — 관리자 확인 필요(재발송·입금 확인 막힘)');
end;
$$;
revoke all on function mall_builder_private.exchange_fee_card_hold_canceled(uuid, text) from public;

-- ── 유저(본인 주문) 1단계: 교환비 카드 결제 준비 — 결제창 성공 주소에서 승인보다 먼저 부른다(별도 요청 = 별도 트랜잭션으로 커밋) ──
-- 외부 호출 없음. 결제 키·금액·토스 주문 번호·멱등키·처음 준비 시각을 고정해 남긴다(강제 중단돼도 결제 키가 남아 직원 다시 확인 가능).
create or replace function public.mall_builder_exchange_fee_card_prepare(p_exchange_id uuid, p_payment_key text, p_amount bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order uuid; o public.mall_builder_orders%rowtype; x public.mall_builder_exchanges%rowtype;
  p public.mall_builder_exchange_fee_payments%rowtype; v_secret text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  perform set_config('lock_timeout', '1000', true);
  select e.order_id into v_order from public.mall_builder_exchanges e where e.id = p_exchange_id;
  if v_order is null then raise exception '교환을 찾을 수 없습니다.'; end if;
  select * into o from public.mall_builder_orders where id = v_order for update;
  if not found or o.user_id is distinct from auth.uid() then raise exception '교환을 찾을 수 없습니다.'; end if;
  select * into x from public.mall_builder_exchanges where id = p_exchange_id for update;
  if not found or x.order_id <> o.id then raise exception '교환을 찾을 수 없습니다.'; end if;
  select * into p from public.mall_builder_exchange_fee_payments where exchange_id = x.id for update;
  if p.id is not null then
    -- 이미 완료: 같은 키·새 키 모두 지금 상태를 그대로 돌려줌(확인 필요면 ok false — 정상 완료로 단정 금지). 외부 호출·새 준비·needs_review 변경 0
    if p.status = 'done' then return jsonb_build_object('ok', not p.needs_review, 'already', true, 'status', 'done', 'needs_review', p.needs_review)
        || case when p.needs_review then jsonb_build_object('unknown', true, 'message', '결제 기록을 쇼핑몰이 확인하고 있습니다. 다시 결제하지 마세요.') else '{}'::jsonb end; end if;
    if p.status = 'canceled' then raise exception '취소된 교환비 결제입니다. 쇼핑몰에 문의해 주세요.'; end if;
    if p.status in ('prepared', 'requested', 'unknown') then
      -- 같은 결제 키: 그대로(처음 준비 시각·멱등키·시한을 바꾸지 않음). 다른 결제 키: 앞 결제가 실제로 됐을 수 있으니 덮어쓰지 않음
      if p.payment_key = coalesce(p_payment_key, '') then
        return jsonb_build_object('ok', true, 'prepared', true, 'status', p.status);
      end if;
      return jsonb_build_object('ok', false, 'unknown', true, 'message', '앞서 한 교환비 결제를 확인하고 있습니다. 쇼핑몰이 확인한 뒤 안내합니다.');
    end if;
    -- failed: 같은 결제 키는 다시 쓰지 않음(새 결제창 결제만)
    if p.payment_key = coalesce(p_payment_key, '') then raise exception '실패한 결제입니다. 결제창에서 다시 결제해 주세요.'; end if;
  end if;
  if not mall_builder_private.exchange_order_status_ok(o.status) then raise exception '주문이 배송 완료(구매 확정 포함) 상태가 아니라 교환비를 결제할 수 없습니다.'; end if;
  if x.step not in ('requested', 'collecting', 'collected') then raise exception '교환비를 결제할 수 있는 단계가 아닙니다.'; end if;
  -- 무통장 입금이 먼저 확인됐으면 준비하지 않는다(이중 수납 방지 — 승인 전이라 카드 돈은 나가지 않음)
  if x.fee <= 0 or x.fee_status <> 'waiting' then raise exception '결제를 기다리는 교환비가 없습니다(이미 입금이 확인됐거나 교환비가 없습니다).'; end if;
  if p_amount is distinct from x.fee then raise exception '결제 금액(%원)이 교환비(%원)와 달라 승인하지 않았습니다.', p_amount, x.fee; end if;
  if coalesce(p_payment_key, '') !~ '^[A-Za-z0-9_-]{10,200}$' then raise exception '결제 정보가 올바르지 않습니다.'; end if;
  select s.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets s where s.store_id = o.store_id;
  if coalesce(v_secret, '') = '' then raise exception '이 몰의 카드 결제 설정이 없습니다.'; end if;

  if p.id is not null then -- 실패한 앞 결제를 새 결제 키로 교체(새 시도라 시각·멱등키도 새로). 교체 직전 앞 시도를 이력에 그대로 남김(같은 트랜잭션)
    perform mall_builder_private.exchange_fee_attempt_archive(p.id, 'replaced_failed');
    update public.mall_builder_exchange_fee_payments set payment_key = p_payment_key, amount = x.fee, status = 'prepared',
      prepared_at = now(), requested_at = null, idempotency_key = 'exfee-confirm-' || p_payment_key,
      method = '', approved_at = null, receipt_url = '', error = '', updated_at = now()
    where id = p.id;
  else
    insert into public.mall_builder_exchange_fee_payments (exchange_id, store_id, order_id, toss_order_id, payment_key, amount, status, prepared_at, idempotency_key)
    values (x.id, o.store_id, o.id, 'exfee-' || x.id::text, p_payment_key, x.fee, 'prepared', now(), 'exfee-confirm-' || p_payment_key);
  end if;
  return jsonb_build_object('ok', true, 'prepared', true, 'status', 'prepared');
end;
$$;

-- ── 유저(본인 주문) 2단계: 준비된 교환비 카드 결제 승인 — prepare가 커밋된 뒤 별도 요청으로 부른다 ──
create or replace function public.mall_builder_exchange_fee_card_confirm(p_exchange_id uuid, p_payment_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order uuid; o public.mall_builder_orders%rowtype; x public.mall_builder_exchanges%rowtype;
  p public.mall_builder_exchange_fee_payments%rowtype; v_secret text; v_status integer; v_body jsonb; v_done boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  -- 잠금을 오래 기다리면 토스에 쓸 시간이 모자라므로 1초만(그 전에는 토스를 부르지 않았으니 다시 시도해도 안전)
  -- 같은 결제를 두 곳에서 동시에 승인하면 뒤 요청은 결제 기록 잠금에서 기다리다 멈춤(토스 호출 0)
  perform set_config('lock_timeout', '1000', true);
  select e.order_id into v_order from public.mall_builder_exchanges e where e.id = p_exchange_id;
  if v_order is null then raise exception '교환을 찾을 수 없습니다.'; end if;
  select * into o from public.mall_builder_orders where id = v_order for update;
  if not found or o.user_id is distinct from auth.uid() then raise exception '교환을 찾을 수 없습니다.'; end if;
  select * into x from public.mall_builder_exchanges where id = p_exchange_id for update;
  if not found or x.order_id <> o.id then raise exception '교환을 찾을 수 없습니다.'; end if;
  select * into p from public.mall_builder_exchange_fee_payments where exchange_id = x.id for update;
  -- 이미 완료면 키와 상관없이 지금 상태 그대로(준비 함수와 같은 계약, 토스 호출 0)
  if p.id is not null and p.status = 'done' then return jsonb_build_object('ok', not p.needs_review, 'already', true, 'status', 'done', 'needs_review', p.needs_review)
        || case when p.needs_review then jsonb_build_object('unknown', true, 'message', '결제 기록을 쇼핑몰이 확인하고 있습니다. 다시 결제하지 마세요.') else '{}'::jsonb end; end if;
  if p.id is null or p.payment_key is distinct from coalesce(p_payment_key, '') then
    raise exception '결제 준비 기록이 없습니다. 결제창에서 다시 시도해 주세요.';
  end if;
  -- 확인 중인 결제는 토스를 다시 부르지 않는다(자동 재결제 없음) — 직원 다시 확인으로만
  if p.status in ('requested', 'unknown') then
    return jsonb_build_object('ok', false, 'unknown', true, 'message', '앞서 한 교환비 결제를 확인하고 있습니다. 쇼핑몰이 확인한 뒤 안내합니다.');
  end if;
  if p.status = 'failed' then return jsonb_build_object('ok', false, 'message', '결제가 승인되지 않았습니다. 결제창에서 다시 결제해 주세요.'); end if;
  if p.status = 'canceled' then raise exception '취소된 교환비 결제입니다. 쇼핑몰에 문의해 주세요.'; end if;
  -- prepared: 처음 준비 뒤 30분 안에서만 자동 승인(토스 멱등 15일보다 훨씬 짧게). 지나면 토스 호출 0, 직원 다시 확인만
  if clock_timestamp() - p.prepared_at > interval '30 minutes' then
    return jsonb_build_object('ok', false, 'unknown', true, 'expired', true,
      'message', '결제 준비 뒤 30분이 지나 자동으로 승인하지 않았습니다. 쇼핑몰이 결제 상태를 확인한 뒤 안내합니다(다시 결제하지 마세요).');
  end if;
  if not mall_builder_private.exchange_order_status_ok(o.status) then raise exception '주문이 배송 완료(구매 확정 포함) 상태가 아니라 교환비를 결제할 수 없습니다.'; end if;
  if x.step not in ('requested', 'collecting', 'collected') then raise exception '교환비를 결제할 수 있는 단계가 아닙니다.'; end if;
  if x.fee <= 0 or x.fee_status <> 'waiting' then raise exception '결제를 기다리는 교환비가 없습니다(이미 입금이 확인됐거나 교환비가 없습니다).'; end if;
  if x.fee <> p.amount then raise exception '준비한 결제 금액(%원)이 교환비(%원)와 달라 승인하지 않았습니다.', p.amount, x.fee; end if;
  select s.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets s where s.store_id = o.store_id;
  if coalesce(v_secret, '') = '' then raise exception '이 몰의 카드 결제 설정이 없습니다.'; end if;
  if (extract(epoch from (clock_timestamp() - statement_timestamp())) * 1000) > 4500 then
    raise exception '서버가 바빠 결제를 승인하지 못했습니다(결제는 되지 않았습니다). 새로고침해 주세요.';
  end if;

  -- 같은 트랜잭션 안의 표시(강제 중단되면 되돌려져 prepared로 남음 → 다시 confirm = 같은 멱등키·같은 본문)
  update public.mall_builder_exchange_fee_payments set status = 'requested', requested_at = now(), error = '', updated_at = now() where id = p.id;

  begin
    select t.status, t.body into v_status, v_body from mall_builder_private.toss_call(v_secret, 'POST', '/v1/payments/confirm',
      jsonb_build_object('paymentKey', p.payment_key, 'orderId', p.toss_order_id, 'amount', p.amount), p.idempotency_key) t;
  exception when others then
    -- 원문(SQLERRM·응답 값)은 남기지 않음 — 고정 문구 + SQLSTATE(5자리 오류 분류 코드)만
    update public.mall_builder_exchange_fee_payments set status = 'unknown', error = '토스 연결 실패(SQLSTATE ' || sqlstate || ') — 관리자 확인 필요', updated_at = now() where id = p.id;
    return jsonb_build_object('ok', false, 'unknown', true, 'message', '카드사 응답이 늦어 결제 결과를 아직 모릅니다. 쇼핑몰이 확인한 뒤 안내합니다.');
  end;

  -- 토스 응답을 받은 뒤의 처리(해석·결제 기록·교환 반영)는 안쪽 블록에서 — 여기서 오류가 나도 결제 기록(결제 키 포함)은 남기고
  -- unknown으로 바꿔 직원 다시 확인으로 복구한다(QA012). 강제 중단(연결 끊김·문장 시간 초과·서버 중단)은 이 블록이 못 막지만
  -- 준비 기록이 이미 커밋돼 있어 prepared로 남는다(결제 키 보존).
  begin
    -- 완료 판정: 상태 DONE + 응답 결제 키가 글자이고 준비 때 고정한 키와 정확히 같음 + 주문 번호 + 금액(숫자 형식) 모두 맞을 때만
    -- (응답 키가 없거나 다르면 완료·교환비 paid 0, unknown·waiting 유지·키 보존 — QA012 Mac msg_ded90d965405 P2)
    v_done := v_status = 200 and v_body ->> 'status' = 'DONE'
              and jsonb_typeof(v_body -> 'paymentKey') = 'string' and v_body ->> 'paymentKey' = p.payment_key
              and v_body ->> 'orderId' = p.toss_order_id
              and coalesce(v_body ->> 'totalAmount', '') ~ '^[0-9]{1,12}$' and (v_body ->> 'totalAmount')::bigint = p.amount;
    if v_done then
      update public.mall_builder_exchange_fee_payments set status = 'done', method = coalesce(v_body ->> 'method', ''),
        approved_at = case when coalesce(v_body ->> 'approvedAt', '') = '' then null else (v_body ->> 'approvedAt')::timestamptz end,
        receipt_url = coalesce(v_body #>> '{receipt,url}', ''), error = '', updated_at = now()
      where id = p.id;
      perform mall_builder_private.exchange_fee_mark_card_paid(x.id, v_body ->> 'method', 'customer');
      return jsonb_build_object('ok', true);
    end if;
    update public.mall_builder_exchange_fee_payments set
      status = case when v_status between 400 and 499 then 'failed' else 'unknown' end,
      -- 토스 원문 메시지는 남기지 않고 오류 코드·상태 이름만(영문 대문자·숫자·밑줄만 통과)
      error = left('토스 HTTP ' || v_status || ' · 코드 ' || coalesce(nullif(regexp_replace(coalesce(v_body ->> 'code', ''), '[^A-Z0-9_]', '', 'g'), ''), '-') ||
                   case when v_status = 200 then ' · 상태 ' || coalesce(nullif(regexp_replace(coalesce(v_body ->> 'status', ''), '[^A-Z0-9_]', '', 'g'), ''), '-') else '' end, 300),
      updated_at = now()
    where id = p.id;
    return jsonb_build_object('ok', false, 'unknown', not (v_status between 400 and 499),
      'message', case when v_status between 400 and 499 then '카드사에서 결제를 승인하지 않았습니다(돈은 나가지 않았습니다). 결제창에서 다시 결제해 주세요.'
                      else '결제 결과를 아직 확인하지 못했습니다. 쇼핑몰이 확인한 뒤 안내합니다.' end);
  exception when others then
    update public.mall_builder_exchange_fee_payments set status = 'unknown',
      error = '토스 응답 처리 중 오류(SQLSTATE ' || sqlstate || ') — 관리자 확인 필요', updated_at = now()
    where id = p.id;
    return jsonb_build_object('ok', false, 'unknown', true, 'message', '결제 결과를 처리하는 중 문제가 생겼습니다. 쇼핑몰이 확인한 뒤 안내합니다(다시 결제하지 마세요).');
  end;
end;
$$;

-- ── 운영사(주문 권한): 교환비 카드 결제를 토스에서 다시 확인 ──
-- 대상: prepared·requested·unknown(결과 확인) + done(승인 뒤 취소·불일치 확인). failed·canceled는 끝난 상태라 조회해도 풀지 않음.
-- 판정은 토스 응답 원래 글자 그대로(대문자 정확 비교) — 기호를 걸러 낸 값은 표시용으로만.
-- 먼저 같은 결제인지(결제 키 글자·준비 키 일치, 주문 번호 일치) 대조. done 기록에서 불일치·정상 DONE 아님·금액 다름·연결/HTTP/처리 실패면
-- needs_review를 켠다(원래 승인 증거 그대로, 재발송 막힘). 끄는 길은 같은 결제의 정확한 DONE + 금액 일치를 실제 조회로 확인했을 때뿐.
-- 오류 기록·반환에 SQLERRM·응답 원문 값 0(고정 문구 + SQLSTATE·HTTP 상태만).
create or replace function public.mall_builder_exchange_fee_card_recheck(p_exchange_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  x public.mall_builder_exchanges%rowtype; p public.mall_builder_exchange_fee_payments%rowtype; v_secret text; v_status integer; v_body jsonb;
  v_raw text; v_disp text; v_same boolean; v_amt boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  perform set_config('lock_timeout', '1000', true);
  x := mall_builder_private.lock_exchange(p_exchange_id); -- 권한 확인 + 주문 → 교환 잠금
  select * into p from public.mall_builder_exchange_fee_payments where exchange_id = x.id for update;
  if not found or p.payment_key = '' then raise exception '결제창에서 돌아온 기록이 없어 확인할 수 없습니다(결제되지 않은 것으로 보입니다).'; end if;
  if p.status in ('failed', 'canceled') then return jsonb_build_object('toss_status', null, 'status', p.status); end if;
  select s.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets s where s.store_id = x.store_id;
  if coalesce(v_secret, '') = '' then raise exception '카드 결제 키가 없습니다.'; end if;
  begin
    select t.status, t.body into v_status, v_body from mall_builder_private.toss_call(v_secret, 'GET', '/v1/payments/' || p.payment_key, null, null) t;
  exception when others then
    if p.status = 'done' then
      update public.mall_builder_exchange_fee_payments set needs_review = true, error = '토스 조회 연결 실패(SQLSTATE ' || sqlstate || ') — 관리자 확인 필요', updated_at = now() where id = p.id;
      return jsonb_build_object('needs_review', true, 'error', '카드사에 연결하지 못했습니다. 이 결제를 「확인 필요」로 표시했습니다.');
    end if;
    raise exception '카드사에 연결하지 못했습니다. 잠시 뒤 다시 눌러 주세요.';
  end;
  if v_status is distinct from 200 then
    if p.status = 'done' then
      update public.mall_builder_exchange_fee_payments set needs_review = true, error = '토스 조회 HTTP ' || coalesce(v_status::text, '-') || ' — 관리자 확인 필요', updated_at = now() where id = p.id;
      return jsonb_build_object('needs_review', true, 'error', '토스에서 결제를 확인하지 못했습니다. 이 결제를 「확인 필요」로 표시했습니다.');
    end if;
    raise exception '확인하지 못했습니다(토스 HTTP %). 상태는 그대로 두었습니다.', v_status;
  end if;
  v_raw := v_body ->> 'status';
  v_disp := left(regexp_replace(coalesce(v_raw, ''), '[^A-Z0-9_]', '', 'g'), 40);
  begin
    v_same := jsonb_typeof(v_body -> 'paymentKey') = 'string' and v_body ->> 'paymentKey' = p.payment_key and v_body ->> 'orderId' = p.toss_order_id;
    v_amt := coalesce(v_body ->> 'totalAmount', '') ~ '^[0-9]{1,12}$' and (v_body ->> 'totalAmount')::bigint = p.amount;
    if not coalesce(v_same, false) then
      update public.mall_builder_exchange_fee_payments set
        status = case when p.status = 'done' then 'done' else 'unknown' end,
        needs_review = (p.status = 'done') or p.needs_review,
        error = '토스 응답의 결제 키·주문 번호가 이 결제와 다릅니다 — 관리자 확인 필요', updated_at = now()
      where id = p.id;
      return jsonb_build_object('toss_status', v_disp, 'mismatch', true);
    end if;
    if v_raw in ('CANCELED', 'PARTIAL_CANCELED') then
      perform mall_builder_private.exchange_fee_card_hold_canceled(p.id, v_raw);
      return jsonb_build_object('toss_status', v_disp, 'held', true);
    end if;
    if p.status = 'done' then
      if v_raw = 'DONE' and coalesce(v_amt, false) then
        update public.mall_builder_exchange_fee_payments set needs_review = false, error = '', updated_at = now() where id = p.id;
        return jsonb_build_object('toss_status', v_disp, 'released', p.needs_review);
      end if;
      update public.mall_builder_exchange_fee_payments set needs_review = true,
        error = case when v_raw = 'DONE' then '토스 결제 금액이 이 결제와 다릅니다 — 관리자 확인 필요'
                     else '토스 상태 ' || coalesce(nullif(v_disp, ''), '-') || ' — 관리자 확인 필요' end,
        updated_at = now()
      where id = p.id;
      return jsonb_build_object('toss_status', v_disp, 'needs_review', true);
    end if;
    if v_raw = 'DONE' and coalesce(v_amt, false) then
      update public.mall_builder_exchange_fee_payments set status = 'done', method = coalesce(v_body ->> 'method', ''),
        approved_at = case when coalesce(v_body ->> 'approvedAt', '') = '' then null else (v_body ->> 'approvedAt')::timestamptz end,
        receipt_url = coalesce(v_body #>> '{receipt,url}', ''), error = '', needs_review = false, updated_at = now()
      where id = p.id;
      perform mall_builder_private.exchange_fee_mark_card_paid(x.id, v_body ->> 'method', 'staff');
    elsif v_raw = 'DONE' then
      update public.mall_builder_exchange_fee_payments set status = 'unknown', error = '토스 결제 금액이 준비한 결제와 다릅니다 — 관리자 확인 필요', updated_at = now() where id = p.id;
    elsif v_raw in ('ABORTED', 'EXPIRED') then
      update public.mall_builder_exchange_fee_payments set status = 'failed', error = '토스 상태 ' || v_raw || '(결제되지 않음)', updated_at = now() where id = p.id;
    end if;
  exception when others then
    update public.mall_builder_exchange_fee_payments set status = case when p.status = 'done' then 'done' else 'unknown' end,
      needs_review = (p.status = 'done') or p.needs_review,
      error = '토스 조회 응답 처리 중 오류(SQLSTATE ' || sqlstate || ') — 관리자 확인 필요', updated_at = now()
    where id = p.id;
    return jsonb_build_object('toss_status', v_disp, 'error', '토스 응답을 처리하지 못했습니다. 결제는 「확인 필요」로 남겼습니다.');
  end;
  return jsonb_build_object('toss_status', v_disp);
end;
$$;

revoke all on function public.mall_builder_exchange_fee_card_prepare(uuid, text, bigint) from public, anon;
grant execute on function public.mall_builder_exchange_fee_card_prepare(uuid, text, bigint) to authenticated;
revoke all on function public.mall_builder_exchange_fee_card_confirm(uuid, text) from public, anon;
grant execute on function public.mall_builder_exchange_fee_card_confirm(uuid, text) to authenticated;
revoke all on function public.mall_builder_exchange_fee_card_recheck(uuid) from public, anon;
grant execute on function public.mall_builder_exchange_fee_card_recheck(uuid) to authenticated;
