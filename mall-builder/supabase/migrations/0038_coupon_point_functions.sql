-- AI 쇼핑몰 빌더 D17 쿠폰 · D18 포인트 — 함수·트리거 (플랜 docs/PLAN_20261109_COUPON_POINT.md, 표는 0037)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 지우기·권한 회수 없음. 적용은 넷으로 나눔:
--   0038a 도우미·발급·포인트 / 0038b 주문 함수 v2(+ 옛 6칸 함수는 v2로 넘김) / 0038c 부분 취소 / 0038d 적립·되돌림 트리거·매일 작업
-- 결정(주인님 2026-11-09): 비회원·견적 주문은 쿠폰·포인트 없음, 쿠폰마다 「사업자 등급가와 같이 쓰기」 선택,
--   부분 취소는 현금(입금·카드·외상)부터 먼저 돌려주고 남으면 포인트로, 전체 취소면 쿠폰(기간 안)·포인트 모두 되돌림.

-- ── 0038a ──
create or replace function mall_builder_private.coupon_give(p_coupon_id uuid, p_customer_id uuid, p_key text, p_source text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  c public.mall_builder_coupons%rowtype;
  v_exp timestamptz;
  v_id uuid;
begin
  select * into c from public.mall_builder_coupons where id = p_coupon_id;
  if c.id is null then return false; end if;
  v_exp := case when c.valid_days is null then c.ends_at
                when c.ends_at is null then now() + make_interval(days => c.valid_days)
                else least(c.ends_at, now() + make_interval(days => c.valid_days)) end;
  insert into public.mall_builder_coupon_issues (store_id, coupon_id, customer_id, issue_key, source, expires_at)
  values (c.store_id, c.id, p_customer_id, coalesce(p_key, ''), p_source, v_exp)
  on conflict (coupon_id, customer_id, issue_key) do nothing
  returning id into v_id;
  return v_id is not null;
end;
$$;

-- 운영자 직접 발급: 전체 / 등급 / 고른 손님. 이미 가진 손님은 건너뜀. 돌려주는 값 = 새로 발급한 수
create or replace function public.mall_builder_coupon_issue(p_coupon_id uuid, p_scope text, p_grade_id uuid default null, p_customer_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  c public.mall_builder_coupons%rowtype;
  r record;
  v_n integer := 0;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into c from public.mall_builder_coupons where id = p_coupon_id;
  if c.id is null or not public.mall_builder_is_store_staff(c.store_id) then raise exception '이 쿠폰을 발급할 권한이 없습니다.'; end if;
  if not c.is_active or (c.ends_at is not null and c.ends_at <= now()) then raise exception '꺼져 있거나 기간이 끝난 쿠폰입니다.'; end if;
  if c.issue_mode <> 'manual' then raise exception '「직접 발급」 쿠폰만 손님을 골라 발급할 수 있습니다.'; end if;
  if p_scope not in ('all', 'grade', 'customers') then raise exception '발급 대상을 골라 주세요.'; end if;
  if p_scope = 'grade' and p_grade_id is null then raise exception '등급을 골라 주세요.'; end if;
  if p_scope = 'customers' and coalesce(cardinality(p_customer_ids), 0) = 0 then raise exception '손님을 1명 이상 골라 주세요.'; end if;
  for r in
    select sc.id from public.mall_builder_store_customers sc
     where sc.store_id = c.store_id
       and (p_scope = 'all' or (p_scope = 'grade' and sc.grade_id = p_grade_id) or (p_scope = 'customers' and sc.id = any(p_customer_ids)))
  loop
    if mall_builder_private.coupon_give(c.id, r.id, '', 'manual') then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;

-- 손님이 받는 다운로드 쿠폰
create or replace function public.mall_builder_coupon_download(p_coupon_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  c public.mall_builder_coupons%rowtype;
  v_customer uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into c from public.mall_builder_coupons where id = p_coupon_id;
  if c.id is null or c.issue_mode <> 'download' or not c.is_active or (c.ends_at is not null and c.ends_at <= now())
     or not exists (select 1 from public.mall_builder_stores s where s.id = c.store_id and s.status = 'active') then
    raise exception '지금 받을 수 없는 쿠폰입니다.';
  end if;
  select sc.id into v_customer from public.mall_builder_store_customers sc where sc.store_id = c.store_id and sc.user_id = auth.uid();
  if v_customer is null then raise exception '이 몰에 가입한 뒤 받을 수 있습니다.'; end if;
  if not mall_builder_private.coupon_give(c.id, v_customer, '', 'download') then raise exception '이미 받은 쿠폰입니다.'; end if;
  return c.name;
end;
$$;

-- 쿠폰 코드 등록(대문자·숫자 4~20자, 입력은 대소문자 구분 없음)
create or replace function public.mall_builder_coupon_redeem(p_store_id uuid, p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  c public.mall_builder_coupons%rowtype;
  v_customer uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into c from public.mall_builder_coupons
   where store_id = p_store_id and issue_mode = 'code' and code = upper(btrim(coalesce(p_code, '')));
  if c.id is null or not c.is_active or (c.ends_at is not null and c.ends_at <= now()) then raise exception '사용할 수 없는 쿠폰 코드입니다.'; end if;
  select sc.id into v_customer from public.mall_builder_store_customers sc where sc.store_id = p_store_id and sc.user_id = auth.uid();
  if v_customer is null then raise exception '이 몰에 가입한 뒤 등록할 수 있습니다.'; end if;
  if not mall_builder_private.coupon_give(c.id, v_customer, '', 'code') then raise exception '이미 등록한 쿠폰입니다.'; end if;
  return c.name;
end;
$$;

-- 가입 쿠폰 자동 발급(몰 가입 직후)
create or replace function public.mall_builder_customers_signup_coupons()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select cp.id from public.mall_builder_coupons cp
            where cp.store_id = new.store_id and cp.issue_mode = 'signup' and cp.is_active and (cp.ends_at is null or cp.ends_at > now())
  loop
    perform mall_builder_private.coupon_give(r.id, new.id, '', 'signup');
  end loop;
  return null;
end;
$$;
create trigger mall_builder_customers_signup_coupons after insert on public.mall_builder_store_customers
  for each row execute function public.mall_builder_customers_signup_coupons();

-- 포인트 잔액 = 소멸 전 묶음의 남은 양 합
create or replace function mall_builder_private.points_balance(p_customer_id uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(l.remaining), 0)::bigint from public.mall_builder_point_ledger l
   where l.customer_id = p_customer_id and l.remaining > 0 and (l.expires_at is null or l.expires_at > now())
$$;

-- 포인트 넣기(적립·돌려줌·운영자 지급) — 새 묶음, 소멸일 = 지금 + 몰 소멸 기간
create or replace function mall_builder_private.points_add(p_store uuid, p_customer uuid, p_order uuid, p_kind text, p_amount bigint, p_note text, p_actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_months integer;
begin
  if p_amount <= 0 then return; end if;
  select ps.expire_months into v_months from public.mall_builder_point_settings ps where ps.store_id = p_store;
  insert into public.mall_builder_point_ledger (store_id, customer_id, order_id, kind, amount, remaining, expires_at, note, actor_id)
  values (p_store, p_customer, p_order, p_kind, p_amount, p_amount, now() + make_interval(months => coalesce(v_months, 12)), left(coalesce(p_note, ''), 200), p_actor);
end;
$$;

-- 포인트 빼기(주문 사용·운영자 차감) — 소멸일 빠른 묶음부터 꺼냄. 부족하면 오류
create or replace function mall_builder_private.points_take(p_store uuid, p_customer uuid, p_order uuid, p_kind text, p_amount bigint, p_note text, p_actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_left bigint := p_amount;
  v_take bigint;
  r record;
begin
  if p_amount <= 0 then return; end if;
  if mall_builder_private.points_balance(p_customer) < p_amount then
    raise exception '포인트가 부족합니다. (보유 %점)', to_char(mall_builder_private.points_balance(p_customer), 'FM999,999,999,990');
  end if;
  for r in
    select l.id, l.remaining from public.mall_builder_point_ledger l
     where l.customer_id = p_customer and l.remaining > 0 and (l.expires_at is null or l.expires_at > now())
     order by l.expires_at nulls last, l.created_at
     for update
  loop
    exit when v_left = 0;
    v_take := least(v_left, r.remaining);
    update public.mall_builder_point_ledger set remaining = remaining - v_take where id = r.id;
    v_left := v_left - v_take;
  end loop;
  insert into public.mall_builder_point_ledger (store_id, customer_id, order_id, kind, amount, remaining, note, actor_id)
  values (p_store, p_customer, p_order, p_kind, -p_amount, 0, left(coalesce(p_note, ''), 200), p_actor);
end;
$$;

-- 운영자 수동 지급(+)·차감(−). 돌려주는 값 = 바뀐 잔액
create or replace function public.mall_builder_points_adjust(p_customer_id uuid, p_amount bigint, p_note text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare sc public.mall_builder_store_customers%rowtype;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into sc from public.mall_builder_store_customers c where c.id = p_customer_id for update;
  if sc.id is null or not public.mall_builder_is_store_staff(sc.store_id) then raise exception '이 손님의 포인트를 바꿀 권한이 없습니다.'; end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 10000000 then raise exception '포인트는 1~10,000,000점 사이로 입력해 주세요.'; end if;
  if char_length(btrim(coalesce(p_note, ''))) not between 1 and 100 then raise exception '사유를 1~100자로 입력해 주세요.'; end if;
  if p_amount > 0 then
    perform mall_builder_private.points_add(sc.store_id, sc.id, null, 'admin', p_amount, '운영자 지급: ' || btrim(p_note), auth.uid());
  else
    perform mall_builder_private.points_take(sc.store_id, sc.id, null, 'admin', -p_amount, '운영자 차감: ' || btrim(p_note), auth.uid());
  end if;
  return mall_builder_private.points_balance(sc.id);
end;
$$;

-- 손님·운영자 화면용 잔액(본인 또는 그 몰 운영자만)
create or replace function public.mall_builder_points_balance(p_customer_id uuid)
returns bigint language plpgsql stable security definer set search_path = '' as $$
declare sc public.mall_builder_store_customers%rowtype;
begin
  select * into sc from public.mall_builder_store_customers c where c.id = p_customer_id;
  if sc.id is null or not (sc.user_id = auth.uid() or public.mall_builder_is_store_staff(sc.store_id)) then return 0; end if;
  return mall_builder_private.points_balance(sc.id);
end;
$$;

-- ── 0038b ── 주문 함수 v2: 0028 mall_builder_place_order와 같은 계산 + 쿠폰(주문당 1장, 대상 상품 금액에만, 배송비 제외) + 포인트
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

    v_elig := v_coupon.id is not null and (
      v_coupon.target = 'all'
      or (v_coupon.target = 'product' and v_line.product_id = any(v_coupon.target_ids))
      or (v_coupon.target = 'category' and exists (select 1 from public.mall_builder_product_categories pc
                                                   where pc.product_id = v_line.product_id and pc.category_id = any(v_coupon.target_ids))));
    if v_elig then v_eligible := v_eligible + v_unit * v_line.qty; end if;

    insert into public.mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, image_url, unit_price, qty, line_total, price_breakdown, shipping_policy_id, coupon_eligible)
    values (v_order, v_line.product_id, v_line.variant_id, v_line.name, coalesce(v_line.variant_key, ''), v_line.images -> 0 ->> 'url',
            v_unit, v_line.qty, v_unit * v_line.qty, v_breakdown, coalesce(v_line.shipping_policy_id, v_default), v_elig);

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

-- 옛 6칸 함수는 v2로 넘김(이미 배포된 화면이 계속 동작하도록)
create or replace function public.mall_builder_place_order(p_store_id uuid, p_address_id uuid, p_depositor text, p_memo text, p_expected_total bigint, p_pay_method text)
returns table(order_id uuid, order_no text)
language sql security definer set search_path to '' as $$
  select * from public.mall_builder_place_order_v2(p_store_id, p_address_id, p_depositor, p_memo, p_expected_total, p_pay_method, null, 0)
$$;

-- ── 0038c ── 부분 취소(0021b + 쿠폰·포인트): 현금부터 먼저 돌려주고 남으면 포인트로
create or replace function public.mall_builder_cancel_order_items(p_order_id uuid, p_items jsonb, p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order public.mall_builder_orders%rowtype;
  v_it jsonb;
  v_item public.mall_builder_order_items%rowtype;
  v_qty integer;
  v_desc text := '';
  v_left integer;
  v_groups jsonb := '{}'::jsonb;
  v_key text;
  v_policy public.mall_builder_shipping_policies%rowtype;
  v_fee bigint;
  v_subtotal bigint := 0;
  v_ship bigint := 0;
  v_diff bigint;
  v_region text;
  v_balance bigint;
  v_gross bigint;
  v_due_old bigint;
  v_elig bigint;
  v_min bigint;
  v_coupon_new bigint := 0;
  v_back bigint;
  v_point_back bigint;
  v_total_new bigint;
  r record;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_order from public.mall_builder_orders o where o.id = p_order_id for update;
  if not found or not public.mall_builder_is_store_staff(v_order.store_id) then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  if v_order.status not in ('pending_payment', 'paid', 'preparing') then raise exception '배송 전 주문만 부분 취소할 수 있습니다.'; end if;
  if char_length(coalesce(p_note, '')) > 200 then raise exception '메모는 200자 이내로 입력해 주세요.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception '취소할 품목과 수량을 골라 주세요.'; end if;

  for v_it in select * from jsonb_array_elements(p_items) loop
    if coalesce(v_it ->> 'qty', '') !~ '^[0-9]+$' then raise exception '취소 수량을 숫자로 입력해 주세요.'; end if;
    v_qty := (v_it ->> 'qty')::integer;
    continue when v_qty = 0;
    select * into v_item from public.mall_builder_order_items i where i.id = (v_it ->> 'item_id')::uuid and i.order_id = p_order_id for update;
    if not found then raise exception '주문 품목을 찾을 수 없습니다.'; end if;
    v_left := v_item.qty - v_item.cancelled_qty;
    if v_qty > v_left then raise exception '「%」은(는) %개까지 취소할 수 있습니다.', v_item.name_snapshot, v_left; end if;
    update public.mall_builder_order_items set cancelled_qty = cancelled_qty + v_qty where id = v_item.id;
    if v_item.stock_deducted then
      if v_item.variant_id is not null then
        update public.mall_builder_product_variants set stock = stock + v_qty where id = v_item.variant_id;
      elsif v_item.product_id is not null then
        update public.mall_builder_products set stock = stock + v_qty where id = v_item.product_id;
      end if;
    end if;
    v_desc := v_desc || case when v_desc = '' then '' else ', ' end || v_item.name_snapshot
              || case when v_item.option_snapshot <> '' then '(' || v_item.option_snapshot || ')' else '' end || ' ' || v_qty || '개';
  end loop;
  if v_desc = '' then raise exception '취소할 수량을 1개 이상 넣어 주세요.'; end if;

  for r in select i.unit_price * (i.qty - i.cancelled_qty) as amount, i.shipping_policy_id from public.mall_builder_order_items i where i.order_id = p_order_id loop
    v_subtotal := v_subtotal + r.amount;
    continue when r.amount = 0;
    v_key := coalesce(r.shipping_policy_id::text, 'none');
    v_groups := jsonb_set(v_groups, array[v_key], to_jsonb(coalesce((v_groups ->> v_key)::bigint, 0) + r.amount));
  end loop;
  if v_subtotal = 0 and not exists (select 1 from public.mall_builder_order_items i where i.order_id = p_order_id and i.qty > i.cancelled_qty) then
    raise exception '모든 품목을 취소하려면 「주문 취소」를 써 주세요.';
  end if;
  v_region := coalesce(v_order.receiver ->> 'region', 'mainland');
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
  v_ship := least(v_ship, v_order.shipping_fee);

  -- 쿠폰: 남은 대상 금액을 넘지 않게. 최소 주문 아래로 내려가면 할인분을 회수하되, 손님이 더 내게 되지는 않게(환불을 줄이는 데까지만)
  v_gross := v_subtotal + v_ship;
  v_due_old := v_order.total + v_order.point_used;
  if v_order.coupon_discount > 0 then
    select coalesce(sum(i.unit_price * (i.qty - i.cancelled_qty)), 0) into v_elig
      from public.mall_builder_order_items i where i.order_id = p_order_id and i.coupon_eligible;
    select cp.min_order into v_min from public.mall_builder_coupon_issues ci join public.mall_builder_coupons cp on cp.id = ci.coupon_id
     where ci.id = v_order.coupon_issue_id;
    v_coupon_new := case when v_elig < coalesce(v_min, 0) then 0 else least(v_order.coupon_discount, v_elig) end;
    v_coupon_new := least(v_order.coupon_discount, greatest(v_coupon_new, v_gross - v_due_old));
  end if;
  v_back := greatest(0, v_due_old - (v_gross - v_coupon_new));
  v_diff := least(v_back, v_order.total);          -- 현금으로 돌려줄 금액
  v_point_back := v_back - v_diff;                 -- 그래도 남으면 포인트로
  v_total_new := v_order.total - v_diff;

  update public.mall_builder_orders set subtotal = v_subtotal, shipping_fee = v_ship, total = v_total_new,
    coupon_discount = v_coupon_new, point_used = point_used - v_point_back, updated_at = now()
   where id = p_order_id;

  if v_point_back > 0 and v_order.customer_id is not null then
    perform mall_builder_private.points_add(v_order.store_id, v_order.customer_id, p_order_id, 'refund', v_point_back,
      '주문 ' || v_order.order_no || ' 부분 취소 — 포인트 돌려줌', v_uid);
  end if;

  if v_diff > 0 and v_order.is_credit and v_order.customer_id is not null then
    perform 1 from public.mall_builder_store_customers c where c.id = v_order.customer_id for update;
    select coalesce(sum(l.amount), 0) into v_balance from public.mall_builder_credit_ledger l where l.customer_id = v_order.customer_id;
    insert into public.mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note, actor_id)
    values (v_order.store_id, v_order.customer_id, p_order_id, 'adjust', -v_diff, v_balance - v_diff, '주문 ' || v_order.order_no || ' 부분 취소 — 외상 되돌림', v_uid);
  end if;

  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (p_order_id, v_order.status, v_order.status, v_uid, 'staff',
          '부분 취소: ' || v_desc || ' · 결제 금액 ' || to_char(v_order.total, 'FM999,999,999,990') || '원 → ' || to_char(v_total_new, 'FM999,999,999,990') || '원'
          || case when v_diff > 0 and v_order.is_credit then ' (외상 되돌림)'
                  when v_diff > 0 and v_order.status <> 'pending_payment' then ' (환불할 금액 ' || to_char(v_diff, 'FM999,999,999,999') || '원)'
                  else '' end
          || case when v_point_back > 0 then ' · 포인트 ' || to_char(v_point_back, 'FM999,999,999,999') || '점 돌려줌' else '' end
          || case when v_coupon_new <> v_order.coupon_discount then ' · 쿠폰 할인 ' || to_char(v_order.coupon_discount, 'FM999,999,999,990') || '원 → ' || to_char(v_coupon_new, 'FM999,999,999,990') || '원' else '' end
          || case when coalesce(btrim(p_note), '') <> '' then ' — ' || btrim(p_note) else '' end);
  return jsonb_build_object('total', v_total_new, 'refund', v_diff, 'point_refund', v_point_back);
end;
$$;

-- ── 0038d ── 주문 상태가 바뀔 때: 취소·반품 완료면 쿠폰(기간 안)·사용 포인트 되돌림, 구매 확정이면 포인트 적립
create or replace function public.mall_builder_orders_benefits()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ps public.mall_builder_point_settings%rowtype;
  v_rate numeric;
  v_pts bigint;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status in ('cancelled', 'returned') and old.status not in ('cancelled', 'returned') then
    if new.point_used > 0 and new.customer_id is not null then
      perform mall_builder_private.points_add(new.store_id, new.customer_id, new.id, 'refund', new.point_used,
        '주문 ' || new.order_no || ' ' || public.mall_builder_status_label(new.status) || ' — 포인트 돌려줌', auth.uid());
    end if;
    if new.coupon_issue_id is not null then
      update public.mall_builder_coupon_issues set used_at = null, order_id = null, discount = null
       where id = new.coupon_issue_id and order_id = new.id and (expires_at is null or expires_at > now());
    end if;
  elsif new.status = 'confirmed' and new.customer_id is not null and not coalesce(new.is_guest, false) and new.points_earned = 0 then
    select * into v_ps from public.mall_builder_point_settings ps where ps.store_id = new.store_id;
    if v_ps.store_id is not null and v_ps.enabled then
      select g.point_rate into v_rate from public.mall_builder_store_customers c
        left join public.mall_builder_customer_grades g on g.id = c.grade_id where c.id = new.customer_id;
      v_pts := floor(greatest(0, new.total - new.shipping_fee) * coalesce(v_rate, v_ps.earn_rate) / 100.0)::bigint;
      if v_pts > 0 then
        perform mall_builder_private.points_add(new.store_id, new.customer_id, new.id, 'earn', v_pts, '주문 ' || new.order_no || ' 구매 확정 적립', null);
        new.points_earned := v_pts;
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger mall_builder_orders_benefits before update of status on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_benefits();

-- 매일 작업(몰 운영자 cron-job.org가 부르는 기존 실행 주소에서 함께): 생일 쿠폰, 기간 지난 포인트 소멸, 7일 안 소멸 예정 문자
-- 여러 번 불려도 같은 결과(생일 쿠폰은 해마다 1장, 소멸은 남은 양 0이 되면 끝, 알림은 묶음마다 1번)
create or replace function public.mall_builder_benefits_run(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_store uuid;
  v_paused boolean;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_year integer;
  v_mds text[];
  v_bday integer := 0;
  v_exp integer := 0;
  v_notice integer := 0;
  v_ps public.mall_builder_point_settings%rowtype;
  v_sms boolean;
  v_name text;
  v_slug text;
  v_phone text;
  c record;
  r record;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token'; end if;
  select x.store_id into v_store from public.mall_builder_store_scheduler_secrets x where x.run_token_hash = p_token_hash;
  if v_store is null then raise exception 'invalid_token'; end if;
  select s.paused into v_paused from public.mall_builder_store_schedulers s where s.store_id = v_store;
  if coalesce(v_paused, true) then return jsonb_build_object('paused', true); end if;

  -- 생일 쿠폰(한국 시간 오늘, 평년 2월 28일에는 2월 29일생도)
  v_year := extract(year from v_today)::integer;
  v_mds := array[to_char(v_today, 'MM-DD')];
  if to_char(v_today, 'MM-DD') = '02-28' and not (v_year % 4 = 0 and (v_year % 100 <> 0 or v_year % 400 = 0)) then v_mds := v_mds || '02-29'; end if;
  for c in select cp.id from public.mall_builder_coupons cp
            where cp.store_id = v_store and cp.issue_mode = 'birthday' and cp.is_active and (cp.ends_at is null or cp.ends_at > now())
  loop
    for r in select sc.id from public.mall_builder_store_customers sc where sc.store_id = v_store and sc.birth_md = any(v_mds) loop
      if mall_builder_private.coupon_give(c.id, r.id, v_year::text, 'birthday') then v_bday := v_bday + 1; end if;
    end loop;
  end loop;

  -- 소멸
  for r in
    select l.id, l.customer_id, l.remaining from public.mall_builder_point_ledger l
     where l.store_id = v_store and l.remaining > 0 and l.expires_at <= now()
     order by l.expires_at limit 1000 for update skip locked
  loop
    update public.mall_builder_point_ledger set remaining = 0 where id = r.id;
    insert into public.mall_builder_point_ledger (store_id, customer_id, kind, amount, remaining, note)
    values (v_store, r.customer_id, 'expire', -r.remaining, 0, '유효기간이 지나 소멸');
    v_exp := v_exp + 1;
  end loop;

  -- 소멸 예정 문자(몰이 문자 알림을 쓸 수 있을 때만)
  select * into v_ps from public.mall_builder_point_settings ps where ps.store_id = v_store;
  select x.solapi_api_key <> '' and x.solapi_api_secret <> '' and ns.sender_phone <> ''
    into v_sms
    from public.mall_builder_store_scheduler_secrets x join public.mall_builder_store_notify_settings ns on ns.store_id = x.store_id
   where x.store_id = v_store;
  if v_ps.store_id is not null and v_ps.enabled and v_ps.expire_notice and coalesce(v_sms, false) then
    select st.name, st.slug into v_name, v_slug from public.mall_builder_stores st where st.id = v_store;
    for r in
      select l.customer_id, sum(l.remaining) as pts, min(l.expires_at) as ex from public.mall_builder_point_ledger l
       where l.store_id = v_store and l.remaining > 0 and l.notified_at is null and l.expires_at > now() and l.expires_at <= now() + interval '7 days'
       group by l.customer_id
    loop
      select sc.phone into v_phone from public.mall_builder_store_customers sc where sc.id = r.customer_id;
      if coalesce(v_phone, '') <> '' then
        insert into public.mall_builder_notifications (store_id, kind, channel, to_phone, body)
        values (v_store, 'customer_point_expire', 'sms', v_phone,
          '[' || coalesce(v_name, '쇼핑몰') || '] 포인트 ' || to_char(r.pts, 'FM999,999,999,999') || '점이 '
          || to_char(r.ex at time zone 'Asia/Seoul', 'FMMM"월" FMDD"일"') || '에 소멸됩니다. {{site}}/s/' || v_slug || '/my');
        v_notice := v_notice + 1;
      end if;
      update public.mall_builder_point_ledger set notified_at = now()
       where store_id = v_store and customer_id = r.customer_id and remaining > 0 and notified_at is null
         and expires_at > now() and expires_at <= now() + interval '7 days';
    end loop;
  end if;
  return jsonb_build_object('paused', false, 'birthday_coupons', v_bday, 'expired_lots', v_exp, 'expire_notices', v_notice);
end;
$$;
