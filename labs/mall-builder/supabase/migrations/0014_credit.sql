-- AI 쇼핑몰 빌더 F16 — 외상 한도·외상 장부
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경. 적용은 둘로 나눔(docs/mall/LESSONS_LEARNED.md):
--   mall_builder_0014a_credit_tables / mall_builder_0014b_credit_functions
-- 결제 방식 제약(pay_method = 'bank')은 바꾸지 않는다(제약 변경 = 지우기 → 확인 창). 대신 주문에 is_credit 칸을 더한다.
-- 장부 금액 부호: 사용(charge) +, 입금(payment) −, 조정(adjust) ±. 사용 중 금액 = 손님별 장부 합계(src/lib/credit.ts와 같음)

-- ── 0014a ──
alter table public.mall_builder_store_customers add column if not exists credit_limit bigint not null default 0
  check (credit_limit between 0 and 1000000000);
alter table public.mall_builder_orders add column if not exists is_credit boolean not null default false;

create table if not exists public.mall_builder_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  customer_id uuid not null references public.mall_builder_store_customers (id) on delete cascade,
  order_id uuid references public.mall_builder_orders (id) on delete set null,
  kind text not null check (kind in ('charge', 'payment', 'adjust')),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null,
  note text not null default '' check (char_length(note) <= 200),
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_credit_ledger_customer on public.mall_builder_credit_ledger (customer_id, created_at);

alter table public.mall_builder_credit_ledger enable row level security;
-- 보기만: 그 손님 본인 + 그 몰 운영자. 쓰기는 함수만
create policy "mall_builder_credit_ledger_read" on public.mall_builder_credit_ledger
  for select using (
    public.mall_builder_is_store_staff(store_id)
    or exists (select 1 from public.mall_builder_store_customers c where c.id = customer_id and c.user_id = (select auth.uid()))
  );

-- 손님 보호 트리거에 외상 한도 칸 추가(손님 요청이면 원래 값으로 되돌림)
create or replace function public.mall_builder_store_customers_protect()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.grade_id := (select g.id from public.mall_builder_customer_grades g where g.store_id = new.store_id and g.code = 'consumer');
    new.kind := 'consumer';
    new.approval_status := 'none';
    new.business_no := null; new.company := null; new.ceo_name := null; new.cert_path := null;
    new.reject_reason := null; new.applied_at := null; new.reviewed_at := null;
    new.credit_limit := 0;
  else
    new.grade_id := old.grade_id; new.kind := old.kind; new.approval_status := old.approval_status;
    new.business_no := old.business_no; new.company := old.company; new.ceo_name := old.ceo_name; new.cert_path := old.cert_path;
    new.reject_reason := old.reject_reason; new.applied_at := old.applied_at; new.reviewed_at := old.reviewed_at;
    new.credit_limit := old.credit_limit;
  end if;
  return new;
end;
$$;

-- ── 0014b ── (실제 적용본 — 지우기 문장 없음, 확인 창 없이 적용)
create or replace function public.mall_builder_set_credit_limit(p_customer_id uuid, p_limit bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_c public.mall_builder_store_customers%rowtype;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_c from public.mall_builder_store_customers c where c.id = p_customer_id for update;
  if not found or not public.mall_builder_is_store_staff(v_c.store_id) then raise exception '이 손님을 고칠 권한이 없습니다.'; end if;
  if p_limit is null or p_limit < 0 or p_limit > 1000000000 then raise exception '외상 한도는 0 이상 숫자로 입력해 주세요.'; end if;
  if p_limit > 0 and v_c.approval_status <> 'approved' then raise exception '외상 한도는 승인된 사업자 회원에게만 줄 수 있습니다.'; end if;
  update public.mall_builder_store_customers set credit_limit = p_limit where id = p_customer_id;
  return p_limit;
end;
$$;

create or replace function public.mall_builder_credit_entry(p_customer_id uuid, p_kind text, p_amount bigint, p_note text default '')
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_c public.mall_builder_store_customers%rowtype;
  v_balance bigint;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_c from public.mall_builder_store_customers c where c.id = p_customer_id for update;
  if not found or not public.mall_builder_is_store_staff(v_c.store_id) then raise exception '이 손님의 장부를 고칠 권한이 없습니다.'; end if;
  if p_kind not in ('payment', 'adjust') then raise exception '입금 또는 조정만 기록할 수 있습니다.'; end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 1000000000 then raise exception '금액을 0이 아닌 숫자로 입력해 주세요.'; end if;
  if p_kind = 'payment' and p_amount > 0 then raise exception '입금은 사용 금액을 줄이는 기록입니다(음수로 저장).'; end if;
  if p_kind = 'adjust' and char_length(btrim(coalesce(p_note, ''))) = 0 then raise exception '조정은 사유 메모가 필요합니다.'; end if;
  if char_length(coalesce(p_note, '')) > 200 then raise exception '메모는 200자 이내로 입력해 주세요.'; end if;
  select coalesce(sum(l.amount), 0) into v_balance from public.mall_builder_credit_ledger l where l.customer_id = p_customer_id;
  insert into public.mall_builder_credit_ledger (store_id, customer_id, kind, amount, balance_after, note, actor_id)
  values (v_c.store_id, p_customer_id, p_kind, p_amount, v_balance + p_amount, coalesce(btrim(p_note), ''), auth.uid());
  return v_balance + p_amount;
end;
$$;

-- 주문 상태 바꾸기: 0009b + 외상 주문 취소·반품 시 장부 되돌림(adjust −합계)
create or replace function public.mall_builder_change_order_status(
  p_order_id uuid, p_to text, p_note text default '', p_courier text default '', p_tracking text default ''
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order public.mall_builder_orders%rowtype;
  v_role text;
  v_balance bigint;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_order from public.mall_builder_orders o where o.id = p_order_id for update;
  if not found then raise exception '주문을 찾을 수 없습니다.'; end if;
  if v_order.user_id = v_uid and public.mall_builder_transition_allowed('customer', v_order.status, p_to) then
    v_role := 'customer';
  elsif public.mall_builder_is_store_staff(v_order.store_id) and public.mall_builder_transition_allowed('staff', v_order.status, p_to) then
    v_role := 'staff';
  elsif not public.mall_builder_is_store_staff(v_order.store_id) and v_order.user_id <> v_uid then
    raise exception '이 주문을 바꿀 권한이 없습니다.';
  else
    raise exception '「%」 상태에서 「%」(으)로 바꿀 수 없습니다.', public.mall_builder_status_label(v_order.status), public.mall_builder_status_label(p_to);
  end if;
  if char_length(coalesce(p_note, '')) > 200 then raise exception '메모는 200자 이내로 입력해 주세요.'; end if;
  if p_to = 'shipping' and (char_length(btrim(coalesce(p_courier, ''))) not between 1 and 30 or char_length(btrim(coalesce(p_tracking, ''))) not between 1 and 40) then
    raise exception '택배사와 송장 번호를 입력해 주세요.';
  end if;
  if p_to in ('cancelled', 'returned') then
    update public.mall_builder_product_variants v set stock = v.stock + i.qty
      from public.mall_builder_order_items i
      where i.order_id = p_order_id and i.stock_deducted and i.variant_id is not null and v.id = i.variant_id;
    update public.mall_builder_products p set stock = p.stock + i.qty
      from public.mall_builder_order_items i
      where i.order_id = p_order_id and i.stock_deducted and i.variant_id is null and p.id = i.product_id;
    update public.mall_builder_order_items i set stock_deducted = false where i.order_id = p_order_id and i.stock_deducted;
    if v_order.is_credit and v_order.customer_id is not null then
      perform 1 from public.mall_builder_store_customers c where c.id = v_order.customer_id for update;
      select coalesce(sum(l.amount), 0) into v_balance from public.mall_builder_credit_ledger l where l.customer_id = v_order.customer_id;
      insert into public.mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note, actor_id)
      values (v_order.store_id, v_order.customer_id, p_order_id, 'adjust', -v_order.total, v_balance - v_order.total,
              '주문 ' || v_order.order_no || ' ' || public.mall_builder_status_label(p_to) || ' — 외상 되돌림', v_uid);
    end if;
  end if;
  update public.mall_builder_orders o set
    status = p_to,
    courier = case when p_to = 'shipping' then btrim(p_courier) else o.courier end,
    tracking_no = case when p_to = 'shipping' then btrim(p_tracking) else o.tracking_no end,
    updated_at = now()
  where o.id = p_order_id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (p_order_id, v_order.status, p_to, v_uid, v_role, coalesce(btrim(p_note), ''));
  return p_to;
end;
$$;

-- ── 0014c ── 새 6칸 주문 함수 mall_builder_place_order(…, p_pay_method 'bank'|'credit') — 앱은 이제 이것만 부른다
-- 0012b 본문과 같고 다른 점만: (1) 손님 줄 for update(외상 금액 계산 겹침 방지) (2) 외상 검사(승인 사업자·한도>0)
-- (3) **지우기 문장 없음** — 준비 중·숨김 줄은 반복문 조건 `p.status not in ('draft','hidden')`으로 빼고, 장바구니 비우기는
--     서버 동작(placeOrderAction)이 손님 권한으로 한다 (4) 합계 뒤 외상이면 한도 확인 → is_credit·결제 완료 → 장부 charge, 아니면 입금 대기
-- 처음 두 번은 delete가 든 본문을 보내 확인 창이 만료(두 번째는 주인님께 미리 알렸으나 자리 비움) → 지우기를 뺀 본문으로 바로 적용.
-- 옛 5칸 함수(장바구니를 스스로 비움)는 그대로 남아 있으나 앱은 쓰지 않는다. 6칸 본문은 DB에서
-- `select pg_get_functiondef('public.mall_builder_place_order(uuid,uuid,text,text,bigint,text)'::regprocedure);` 로 꺼내 볼 수 있다.
