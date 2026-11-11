-- AI 쇼핑몰 빌더 D21 — 공동구매(목표 수량·마감, 못 채우면 일괄 취소·환불) (플랜 docs/PLAN_20261109_GROUP_BUY.md)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만(지우기·권한 회수 없음 — 함수는 create or replace).
-- 결정(주인님 2026-11-09): 참여 때 바로 결제 · 마감 판정 자동, 취소·환불은 운영자 버튼 한 번 · 결제 완료된 수량만 셈 · 정해진 공동구매 가격 · 쿠폰·포인트 허용.
-- 공동구매 상품은 그 상품만 따로 주문(실패 때 주문째 취소). 비회원·견적 주문은 공동구매 상품을 살 수 없다(품목 넣기 전 트리거).

-- ── 0041a 표·칸 ──
create table if not exists public.mall_builder_group_buys (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 60),
  group_price bigint not null check (group_price >= 0),
  target_qty integer not null check (target_qty between 1 and 100000),
  max_per_customer integer check (max_per_customer is null or max_per_customer between 1 and 10000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'succeeded', 'failed', 'failed_done', 'cancelled')),
  achieved_qty integer,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint mall_builder_group_buys_period check (ends_at > starts_at)
);
create unique index if not exists mall_builder_group_buys_one_active on public.mall_builder_group_buys (product_id) where status = 'active';
create index if not exists mall_builder_group_buys_store on public.mall_builder_group_buys (store_id, created_at desc);
alter table public.mall_builder_group_buys enable row level security;
create policy mall_builder_group_buys_read on public.mall_builder_group_buys for select using (
  public.mall_builder_is_store_staff(store_id) or (status <> 'cancelled' and public.mall_builder_closed_ok(store_id))
);
create policy mall_builder_group_buys_insert on public.mall_builder_group_buys for insert with check (public.mall_builder_is_store_staff(store_id));
create policy mall_builder_group_buys_update on public.mall_builder_group_buys for update using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));

alter table public.mall_builder_order_items add column if not exists group_buy_id uuid references public.mall_builder_group_buys (id) on delete set null;
create index if not exists mall_builder_order_items_group_buy on public.mall_builder_order_items (group_buy_id) where group_buy_id is not null;

-- ── 0041b 계산·판정 ──
-- 지금 진행 중인 공동구매(상품당 하나, 기간 안)
create or replace function mall_builder_private.group_buy_open(p_product_id uuid)
returns public.mall_builder_group_buys language sql stable security definer set search_path = '' as $$
  select g.* from public.mall_builder_group_buys g
   where g.product_id = p_product_id and g.status = 'active' and now() >= g.starts_at and now() < g.ends_at
   limit 1
$$;

-- 달성 수량 = 결제 완료(이후 단계 포함)된 주문의 남은 수량
create or replace function mall_builder_private.group_buy_qty(p_group_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(i.qty - i.cancelled_qty), 0)::integer
    from public.mall_builder_order_items i join public.mall_builder_orders o on o.id = i.order_id
   where i.group_buy_id = p_group_id and o.status in ('paid', 'preparing', 'shipping', 'delivered', 'confirmed')
$$;

-- 손님 화면: 상품의 공동구매 진행(진행 중이거나 판정 끝난 가장 최근 것). 없으면 null
create or replace function public.mall_builder_group_buy_info(p_product_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', g.id, 'title', g.title, 'group_price', g.group_price, 'target_qty', g.target_qty,
           'max_per_customer', g.max_per_customer, 'starts_at', g.starts_at, 'ends_at', g.ends_at, 'status', g.status,
           'open', g.status = 'active' and now() >= g.starts_at and now() < g.ends_at,
           'achieved_qty', coalesce(g.achieved_qty, mall_builder_private.group_buy_qty(g.id)))
    from public.mall_builder_group_buys g join public.mall_builder_products p on p.id = g.product_id
   where g.product_id = p_product_id and g.status <> 'cancelled' and public.mall_builder_product_visible(p.id)
   order by g.created_at desc limit 1
$$;

-- 판정: 마감 뒤 목표 달성이면 성공, 아니면 실패. 참여 손님에게 문자(몰이 문자 알림을 쓸 수 있을 때). 이미 판정한 건은 그대로
create or replace function mall_builder_private.group_buy_judge(p_group_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  g public.mall_builder_group_buys%rowtype;
  v_qty integer;
  v_state text;
  v_sms boolean;
  v_name text;
  v_slug text;
  r record;
begin
  select * into g from public.mall_builder_group_buys where id = p_group_id for update;
  if g.id is null or g.status <> 'active' then return coalesce(g.status, 'none'); end if;
  v_qty := mall_builder_private.group_buy_qty(g.id);
  v_state := case when v_qty >= g.target_qty then 'succeeded' else 'failed' end;
  update public.mall_builder_group_buys set status = v_state, achieved_qty = v_qty, decided_at = now() where id = g.id;
  select x.solapi_api_key <> '' and x.solapi_api_secret <> '' and ns.sender_phone <> ''
    and exists (select 1 from public.mall_builder_store_schedulers sc where sc.store_id = x.store_id and sc.job_id is not null and not sc.paused)
    into v_sms
    from public.mall_builder_store_scheduler_secrets x join public.mall_builder_store_notify_settings ns on ns.store_id = x.store_id
   where x.store_id = g.store_id;
  if coalesce(v_sms, false) then
    select st.name, st.slug into v_name, v_slug from public.mall_builder_stores st where st.id = g.store_id;
    for r in
      select distinct c.phone from public.mall_builder_order_items i
        join public.mall_builder_orders o on o.id = i.order_id
        join public.mall_builder_store_customers c on c.id = o.customer_id
       where i.group_buy_id = g.id and o.status not in ('cancelled', 'returned') and coalesce(c.phone, '') <> ''
    loop
      insert into public.mall_builder_notifications (store_id, kind, channel, to_phone, body)
      values (g.store_id, 'customer_group_buy_' || v_state, 'sms', r.phone,
        '[' || coalesce(v_name, '쇼핑몰') || '] 공동구매 「' || g.title || '」 ' ||
        case when v_state = 'succeeded' then '목표를 달성했습니다! 곧 배송을 준비합니다.'
             else '목표 수량을 채우지 못해 주문이 취소됩니다. 결제하신 금액은 환불됩니다.' end || ' {{site}}/s/' || v_slug || '/orders');
    end loop;
  end if;
  return v_state;
end;
$$;

-- 예약 실행(몰 운영자 cron-job.org): 마감 지난 공동구매 판정
create or replace function public.mall_builder_group_buy_run(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_store uuid;
  v_paused boolean;
  v_ok integer := 0;
  v_fail integer := 0;
  r record;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token'; end if;
  select x.store_id into v_store from public.mall_builder_store_scheduler_secrets x where x.run_token_hash = p_token_hash;
  if v_store is null then raise exception 'invalid_token'; end if;
  select s.paused into v_paused from public.mall_builder_store_schedulers s where s.store_id = v_store;
  if coalesce(v_paused, true) then return jsonb_build_object('paused', true); end if;
  for r in select g.id from public.mall_builder_group_buys g where g.store_id = v_store and g.status = 'active' and g.ends_at <= now() limit 50 loop
    if mall_builder_private.group_buy_judge(r.id) = 'succeeded' then v_ok := v_ok + 1; else v_fail := v_fail + 1; end if;
  end loop;
  return jsonb_build_object('paused', false, 'succeeded', v_ok, 'failed', v_fail);
end;
$$;

-- 운영자: 지금 마감(바로 판정)
create or replace function public.mall_builder_group_buy_close(p_group_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare g public.mall_builder_group_buys%rowtype;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into g from public.mall_builder_group_buys where id = p_group_id;
  if g.id is null or not public.mall_builder_is_store_staff(g.store_id) then raise exception '이 공동구매를 바꿀 권한이 없습니다.'; end if;
  if g.status <> 'active' then raise exception '이미 마감한 공동구매입니다.'; end if;
  update public.mall_builder_group_buys set ends_at = greatest(starts_at + interval '1 second', least(ends_at, now())) where id = g.id;
  return mall_builder_private.group_buy_judge(g.id);
end;
$$;

-- 운영자: 실패한 공동구매 주문 일괄 취소·환불. 주문마다 따로 처리해 하나가 실패해도 나머지는 계속한다
--   카드 → 카드 취소·자동 환불, 무통장 입금 대기 → 취소, 무통장 결제 완료 → 취소(환불할 목록), 외상 → 취소(장부 되돌림)
create or replace function public.mall_builder_group_buy_cancel_all(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g public.mall_builder_group_buys%rowtype;
  r record;
  v_done integer := 0;
  v_refund jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_note text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into g from public.mall_builder_group_buys where id = p_group_id;
  if g.id is null or not public.mall_builder_is_store_staff(g.store_id) then raise exception '이 공동구매를 바꿀 권한이 없습니다.'; end if;
  if g.status not in ('failed', 'failed_done') then raise exception '목표를 채우지 못한(실패) 공동구매만 일괄 취소할 수 있습니다.'; end if;
  v_note := '공동구매 「' || g.title || '」 목표 미달로 취소';
  for r in
    select distinct o.id, o.order_no, o.status, o.is_card, o.is_credit, o.total
      from public.mall_builder_order_items i join public.mall_builder_orders o on o.id = i.order_id
     where i.group_buy_id = g.id and o.status not in ('cancelled', 'returned')
  loop
    begin
      if r.is_card then
        perform public.mall_builder_card_cancel_order(r.id, 'cancelled', v_note);
      else
        perform public.mall_builder_change_order_status(r.id, 'cancelled', v_note, '', '');
        if r.status <> 'pending_payment' and not r.is_credit and r.total > 0 then
          v_refund := v_refund || jsonb_build_array(jsonb_build_object('order_id', r.id, 'order_no', r.order_no, 'amount', r.total));
        end if;
      end if;
      v_done := v_done + 1;
    exception when others then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('order_id', r.id, 'order_no', r.order_no, 'error', left(sqlerrm, 200)));
    end;
  end loop;
  if jsonb_array_length(v_errors) = 0 then
    update public.mall_builder_group_buys set status = 'failed_done' where id = g.id;
  end if;
  return jsonb_build_object('cancelled', v_done, 'bank_refunds', v_refund, 'errors', v_errors);
end;
$$;

-- 비회원·견적 주문 등 공동구매 표시 없이 들어오는 진행 중 공동구매 상품은 막는다
create or replace function public.mall_builder_order_items_group_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.group_buy_id is null and new.product_id is not null and exists (
    select 1 from public.mall_builder_group_buys g
     where g.product_id = new.product_id and g.status = 'active' and now() >= g.starts_at and now() < g.ends_at) then
    raise exception '공동구매 중인 상품은 회원 주문(장바구니 주문)으로만 살 수 있습니다.';
  end if;
  return new;
end;
$$;
create trigger mall_builder_order_items_group_guard before insert on public.mall_builder_order_items
  for each row execute function public.mall_builder_order_items_group_guard();

-- ── 0041c 주문 함수 v2(0038b) + 공동구매: 공동구매가·단독 주문·1인 최대 수량·품목에 공동구매 표시 ──
create or replace function public.mall_builder_place_order_v2(p_store_id uuid, p_address_id uuid, p_depositor text, p_memo text, p_expected_total bigint, p_pay_method text,
  p_coupon_issue_id uuid default null, p_points bigint default 0)
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
  v_issue public.mall_builder_coupon_issues%rowtype;
  v_coupon public.mall_builder_coupons%rowtype;
  v_elig boolean;
  v_eligible bigint := 0;
  v_coupon_amt bigint := 0;
  v_points bigint := coalesce(p_points, 0);
  v_ps public.mall_builder_point_settings%rowtype;
  v_pbal bigint;
  v_pmax bigint;
  v_total bigint;
  v_gb public.mall_builder_group_buys%rowtype;
  v_gb_id uuid;
  v_gb_count integer := 0;
  v_prev integer;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_pay_method not in ('bank', 'credit', 'card') then raise exception '결제 방법을 골라 주세요.'; end if;
  if v_points < 0 then raise exception '사용할 포인트를 다시 입력해 주세요.'; end if;
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

  -- 쿠폰: 본인 것·안 쓴 것·기간 안·켜진 쿠폰, 사업자 등급가와 같이 쓰기는 쿠폰 설정을 따름
  if p_coupon_issue_id is not null then
    select * into v_issue from public.mall_builder_coupon_issues i
     where i.id = p_coupon_issue_id and i.customer_id = v_customer.id and i.store_id = p_store_id for update;
    if not found then raise exception '쿠폰을 찾을 수 없습니다.'; end if;
    if v_issue.used_at is not null then raise exception '이미 쓴 쿠폰입니다.'; end if;
    if v_issue.expires_at is not null and v_issue.expires_at <= now() then raise exception '기간이 끝난 쿠폰입니다.'; end if;
    select * into v_coupon from public.mall_builder_coupons cp where cp.id = v_issue.coupon_id;
    if not v_coupon.is_active then raise exception '지금 쓸 수 없는 쿠폰입니다.'; end if;
    if v_viewer = 'business' and not v_coupon.allow_business then raise exception '이 쿠폰은 사업자 가격과 함께 쓸 수 없습니다.'; end if;
  end if;

  perform 1 from public.mall_builder_products p
    where p.id in (select ci.product_id from public.mall_builder_cart_items ci where ci.store_id = p_store_id and ci.user_id = v_uid)
    order by p.id for update;
  perform 1 from public.mall_builder_product_variants v
    where v.id in (select ci.variant_id from public.mall_builder_cart_items ci where ci.store_id = p_store_id and ci.user_id = v_uid)
    order by v.id for update;

  -- 공동구매(D21): 진행 중인 공동구매 상품은 그 상품만 따로 주문
  select count(distinct ci.product_id) filter (where (mall_builder_private.group_buy_open(ci.product_id)).id is not null), count(distinct ci.product_id)
    into v_gb_count, v_prev
    from public.mall_builder_cart_items ci join public.mall_builder_products p on p.id = ci.product_id
   where ci.store_id = p_store_id and ci.user_id = v_uid and p.status not in ('draft', 'hidden');
  if v_gb_count > 0 and v_prev > 1 then raise exception '공동구매 상품은 다른 상품과 따로 주문해 주세요. 장바구니에 공동구매 상품만 남겨 주세요.'; end if;

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
    v_gb := mall_builder_private.group_buy_open(v_line.product_id);
    v_gb_id := v_gb.id;
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

    if v_gb_id is not null then
      -- 공동구매가 = 정해진 가격 + 옵션 추가금(등급가·수량 할인은 쓰지 않음)
      v_unit := greatest(0, v_gb.group_price + v_extra);
      v_breakdown := jsonb_build_array(jsonb_build_object('label', '판매가', 'amount', v_line.base_price));
      if v_extra <> 0 then v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '옵션 추가금', 'amount', v_extra)); end if;
      if v_unit <> v_base then v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object('label', '공동구매가', 'amount', v_unit - v_base)); end if;
      if v_gb.max_per_customer is not null then
        select coalesce(sum(i.qty - i.cancelled_qty), 0) into v_prev
          from public.mall_builder_order_items i join public.mall_builder_orders o on o.id = i.order_id
         where i.group_buy_id = v_gb_id and o.customer_id = v_customer.id and o.status not in ('cancelled', 'returned');
        if v_prev + v_line.qty > v_gb.max_per_customer then
          raise exception '공동구매 「%」은(는) 1인 최대 %개입니다(이미 %개 참여).', v_gb.title, v_gb.max_per_customer, v_prev;
        end if;
      end if;
    end if;

    select * into v_tier from public.mall_builder_product_volume_tiers t
      where t.product_id = v_line.product_id and t.min_qty <= v_line.qty order by t.min_qty desc limit 1;
    if found and v_gb_id is null then
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

    v_elig := v_coupon.id is not null and (
      v_coupon.target = 'all'
      or (v_coupon.target = 'product' and v_line.product_id = any(v_coupon.target_ids))
      or (v_coupon.target = 'category' and exists (select 1 from public.mall_builder_product_categories pc
                                                   where pc.product_id = v_line.product_id and pc.category_id = any(v_coupon.target_ids))));
    if v_elig then v_eligible := v_eligible + v_unit * v_line.qty; end if;

    insert into public.mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, image_url, unit_price, qty, line_total, price_breakdown, shipping_policy_id, coupon_eligible, group_buy_id)
    values (v_order, v_line.product_id, v_line.variant_id, v_line.name, coalesce(v_line.variant_key, ''), v_line.images -> 0 ->> 'url',
            v_unit, v_line.qty, v_unit * v_line.qty, v_breakdown, coalesce(v_line.shipping_policy_id, v_default), v_elig, v_gb_id);

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

  -- 쿠폰 할인(대상 상품 금액 기준, 배송비 제외)
  if v_coupon.id is not null then
    if v_eligible = 0 then raise exception '이 쿠폰을 쓸 수 있는 상품이 없습니다.'; end if;
    if v_eligible < v_coupon.min_order then
      raise exception '이 쿠폰은 대상 상품을 %원 이상 주문할 때 쓸 수 있습니다.', to_char(v_coupon.min_order, 'FM999,999,999,999');
    end if;
    v_coupon_amt := case v_coupon.discount_type
      when 'amount' then v_coupon.value::bigint
      else least(floor(v_eligible * v_coupon.value / 100.0)::bigint, coalesce(v_coupon.max_discount, v_eligible)) end;
    v_coupon_amt := least(v_coupon_amt, v_eligible);
  end if;

  -- 포인트(상품 금액 − 쿠폰 할인의 사용 비율 안에서, 사용 단위로)
  if v_points > 0 then
    select * into v_ps from public.mall_builder_point_settings ps where ps.store_id = p_store_id;
    if v_ps.store_id is null or not v_ps.enabled then raise exception '이 몰은 지금 포인트를 쓸 수 없습니다.'; end if;
    if v_points % v_ps.use_unit <> 0 then raise exception '포인트는 %점 단위로 쓸 수 있습니다.', v_ps.use_unit; end if;
    v_pbal := mall_builder_private.points_balance(v_customer.id);
    if v_pbal < v_ps.min_use then raise exception '포인트는 %점 이상 모이면 쓸 수 있습니다.', to_char(v_ps.min_use, 'FM999,999,999,990'); end if;
    if v_points > v_pbal then raise exception '포인트가 부족합니다. (보유 %점)', to_char(v_pbal, 'FM999,999,999,990'); end if;
    v_pmax := floor((v_subtotal - v_coupon_amt) * v_ps.max_use_rate / 100.0 / v_ps.use_unit)::bigint * v_ps.use_unit;
    if v_points > v_pmax then raise exception '이번 주문에는 포인트를 최대 %점까지 쓸 수 있습니다.', to_char(v_pmax, 'FM999,999,999,990'); end if;
  end if;

  v_total := v_subtotal + v_ship - v_coupon_amt - v_points;
  if p_expected_total is distinct from v_total then
    raise exception '가격이 바뀌었습니다. 주문서를 다시 확인해 주세요. (현재 %원)', to_char(v_total, 'FM999,999,999,990');
  end if;

  update public.mall_builder_orders set subtotal = v_subtotal, shipping_fee = v_ship, total = v_total,
    coupon_issue_id = case when v_coupon.id is not null then v_issue.id end, coupon_discount = v_coupon_amt, point_used = v_points
   where id = v_order;
  if v_coupon.id is not null then
    update public.mall_builder_coupon_issues set used_at = now(), order_id = v_order, discount = v_coupon_amt where id = v_issue.id;
  end if;
  if v_points > 0 then
    perform mall_builder_private.points_take(p_store_id, v_customer.id, v_order, 'use', v_points, '주문 ' || v_no, v_uid);
  end if;

  if v_total = 0 then
    -- 쿠폰·포인트로 전액: 카드는 0원 결제를 못 하므로 막고, 나머지는 바로 결제 완료
    if p_pay_method = 'card' then raise exception '결제할 금액이 0원입니다. 결제 방법을 「무통장 입금」으로 골라 주세요.'; end if;
    update public.mall_builder_orders set status = 'paid', pay_deadline_at = null where id = v_order;
    insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
    values (v_order, null, 'paid', v_uid, 'customer', '쿠폰·포인트로 전액 결제(결제 완료)');
  elsif p_pay_method = 'credit' then
    select coalesce(sum(l.amount), 0) into v_balance from public.mall_builder_credit_ledger l where l.customer_id = v_customer.id;
    if v_balance + v_total > v_customer.credit_limit then
      raise exception '외상 한도를 넘습니다. (남은 한도 %원)', to_char(greatest(0, v_customer.credit_limit - v_balance), 'FM999,999,999,999');
    end if;
    update public.mall_builder_orders set is_credit = true, status = 'paid' where id = v_order;
    insert into public.mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note, actor_id)
    values (p_store_id, v_customer.id, v_order, 'charge', v_total, v_balance + v_total, '주문 ' || v_no, v_uid);
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
