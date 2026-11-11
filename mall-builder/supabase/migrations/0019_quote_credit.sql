-- AI 쇼핑몰 빌더 D3 — 견적 주문도 외상(후불)으로
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경: 결제 방법 칸이 붙은 6칸 함수를 새로 만든다(옛 5칸 함수는 남겨 두고 앱만 6칸을 씀). 지우기 문장 없음.
-- 외상 규칙은 장바구니 주문 함수(0014, mall_builder_place_order 6칸)와 같다: 승인 사업자만, 한도 > 0, 사용 중 + 이번 금액 ≤ 한도, 결제 완료로 시작 + 장부 charge 1줄.
-- 적용 이름: mall_builder_0019_order_from_quote_credit

create or replace function public.mall_builder_order_from_quote(
  p_quote_id uuid, p_address_id uuid, p_depositor text, p_memo text, p_expected_total bigint, p_pay_method text)
returns table(order_id uuid, order_no text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_quote public.mall_builder_quotes%rowtype;
  v_store public.mall_builder_stores%rowtype;
  v_customer public.mall_builder_store_customers%rowtype;
  v_addr public.mall_builder_customer_addresses%rowtype;
  v_viewer text;
  v_region text;
  v_default uuid;
  v_order uuid;
  v_seq integer;
  v_no text;
  v_line record;
  v_has_opt boolean;
  v_avail integer;
  v_key text;
  v_groups jsonb := '{}'::jsonb;
  v_subtotal bigint := 0;
  v_ship bigint := 0;
  v_policy public.mall_builder_shipping_policies%rowtype;
  v_fee bigint;
  v_info jsonb;
  v_balance bigint;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_pay_method not in ('bank', 'credit') then raise exception '결제 방법을 골라 주세요.'; end if;
  select * into v_quote from public.mall_builder_quotes q where q.id = p_quote_id for update;
  if not found or v_quote.user_id <> v_uid then raise exception '견적을 찾을 수 없습니다.'; end if;
  if v_quote.status <> 'answered' then raise exception '회신받은 견적만 주문할 수 있습니다.'; end if;
  if v_quote.valid_until < (now() at time zone 'Asia/Seoul')::date then raise exception '유효기한이 지난 견적입니다. 다시 요청해 주세요.'; end if;
  select * into v_store from public.mall_builder_stores s where s.id = v_quote.store_id and s.status = 'active' for update;
  if not found then raise exception '주문할 수 없는 몰입니다.'; end if;
  select * into v_customer from public.mall_builder_store_customers c where c.store_id = v_quote.store_id and c.user_id = v_uid for update;
  if not found then raise exception '이 몰에 가입한 뒤 주문할 수 있습니다.'; end if;
  select * into v_addr from public.mall_builder_customer_addresses a where a.id = p_address_id and a.customer_id = v_customer.id;
  if not found then raise exception '배송지를 골라 주세요.'; end if;
  if char_length(btrim(coalesce(p_depositor, ''))) not between 1 and 20 then raise exception '입금자명을 1~20자로 입력해 주세요.'; end if;
  if char_length(coalesce(p_memo, '')) > 200 then raise exception '배송 메모는 200자 이내로 입력해 주세요.'; end if;

  if p_pay_method = 'credit' then
    select case when v_customer.approval_status = 'approved' and g.is_business then 'business' else 'other' end into v_viewer
      from public.mall_builder_customer_grades g where g.id = v_customer.grade_id;
    if coalesce(v_viewer, 'other') <> 'business' then raise exception '외상은 승인된 사업자 회원만 쓸 수 있습니다.'; end if;
    if v_customer.credit_limit <= 0 then raise exception '외상 한도가 없습니다. 운영자에게 문의해 주세요.'; end if;
  end if;

  perform 1 from public.mall_builder_products p
    where p.id in (select i.product_id from public.mall_builder_quote_items i where i.quote_id = p_quote_id) order by p.id for update;
  perform 1 from public.mall_builder_product_variants v
    where v.id in (select i.variant_id from public.mall_builder_quote_items i where i.quote_id = p_quote_id) order by v.id for update;

  v_region := public.mall_builder_region(v_addr.zip);
  select sp.id into v_default from public.mall_builder_shipping_policies sp where sp.store_id = v_quote.store_id and sp.is_default;
  select coalesce(max(o.seq), 0) + 1 into v_seq from public.mall_builder_orders o where o.store_id = v_quote.store_id;
  v_no := to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');
  v_info := coalesce(v_store.business_info, '{}'::jsonb);

  insert into public.mall_builder_orders (store_id, seq, order_no, user_id, customer_id, receiver, depositor, bank, memo, quote_id)
  values (
    v_quote.store_id, v_seq, v_no, v_uid, v_customer.id,
    jsonb_build_object('label', v_addr.label, 'receiver', v_addr.receiver, 'phone', v_addr.phone, 'zip', v_addr.zip, 'addr1', v_addr.addr1, 'addr2', v_addr.addr2, 'region', v_region),
    btrim(p_depositor),
    jsonb_build_object('bank_name', v_info ->> 'bank_name', 'bank_account', v_info ->> 'bank_account', 'bank_holder', v_info ->> 'bank_holder'),
    coalesce(p_memo, ''), p_quote_id
  ) returning id into v_order;

  for v_line in
    select i.qty, i.quoted_price, i.name_snapshot, i.option_snapshot,
           p.id as product_id, p.status, p.stock_mode, p.stock, p.option_groups, p.images, p.shipping_policy_id,
           v.id as variant_id, v.stock as variant_stock, v.is_active
    from public.mall_builder_quote_items i
    left join public.mall_builder_products p on p.id = i.product_id
    left join public.mall_builder_product_variants v on v.id = i.variant_id
    where i.quote_id = p_quote_id
  loop
    if v_line.product_id is null then raise exception '「%」 상품이 삭제되어 주문할 수 없습니다.', v_line.name_snapshot; end if;
    if v_line.status = 'sold_out' then raise exception '「%」은(는) 품절된 상품입니다.', v_line.name_snapshot; end if;
    if v_line.status <> 'on_sale' then raise exception '「%」은(는) 지금 판매하지 않는 상품입니다.', v_line.name_snapshot; end if;
    v_has_opt := jsonb_array_length(coalesce(v_line.option_groups, '[]'::jsonb)) > 0;
    if v_has_opt and (v_line.variant_id is null or not v_line.is_active) then raise exception '「% %」 옵션은 판매하지 않습니다.', v_line.name_snapshot, v_line.option_snapshot; end if;
    if v_line.stock_mode = 'product' then
      v_avail := case when v_has_opt then v_line.variant_stock else v_line.stock end;
      if v_avail <= 0 then raise exception '「%」은(는) 품절입니다.', v_line.name_snapshot; end if;
      if v_line.qty > v_avail then raise exception '「%」 재고가 %개 남았습니다.', v_line.name_snapshot, v_avail; end if;
      if v_has_opt then
        update public.mall_builder_product_variants set stock = stock - v_line.qty where id = v_line.variant_id;
      else
        update public.mall_builder_products set stock = stock - v_line.qty where id = v_line.product_id;
      end if;
    end if;
    insert into public.mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, image_url, unit_price, qty, line_total, price_breakdown, shipping_policy_id)
    values (v_order, v_line.product_id, v_line.variant_id, v_line.name_snapshot, v_line.option_snapshot, v_line.images -> 0 ->> 'url',
            v_line.quoted_price, v_line.qty, v_line.quoted_price * v_line.qty,
            jsonb_build_array(jsonb_build_object('label', '견적가(' || v_quote.quote_no || ')', 'amount', v_line.quoted_price)),
            coalesce(v_line.shipping_policy_id, v_default));
    v_subtotal := v_subtotal + v_line.quoted_price * v_line.qty;
    v_key := coalesce(coalesce(v_line.shipping_policy_id, v_default)::text, 'none');
    v_groups := jsonb_set(v_groups, array[v_key], to_jsonb(coalesce((v_groups ->> v_key)::bigint, 0) + v_line.quoted_price * v_line.qty));
  end loop;

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
    raise exception '금액이 바뀌었습니다. 다시 확인해 주세요. (현재 %원)', to_char(v_subtotal + v_ship, 'FM999,999,999,999');
  end if;
  update public.mall_builder_orders set subtotal = v_subtotal, shipping_fee = v_ship, total = v_subtotal + v_ship where id = v_order;

  if p_pay_method = 'credit' then
    select coalesce(sum(l.amount), 0) into v_balance from public.mall_builder_credit_ledger l where l.customer_id = v_customer.id;
    if v_balance + v_subtotal + v_ship > v_customer.credit_limit then
      raise exception '외상 한도를 넘습니다. (남은 한도 %원)', to_char(greatest(0, v_customer.credit_limit - v_balance), 'FM999,999,999,999');
    end if;
    update public.mall_builder_orders set is_credit = true, status = 'paid' where id = v_order;
    insert into public.mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note, actor_id)
    values (v_quote.store_id, v_customer.id, v_order, 'charge', v_subtotal + v_ship, v_balance + v_subtotal + v_ship, '주문 ' || v_no || '(견적 ' || v_quote.quote_no || ')', v_uid);
    insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
    values (v_order, null, 'paid', v_uid, 'customer', '견적 ' || v_quote.quote_no || ' 외상 주문(결제 완료)');
  else
    insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
    values (v_order, null, 'pending_payment', v_uid, 'customer', '견적 ' || v_quote.quote_no || ' 주문 전환(무통장 입금 대기)');
  end if;
  update public.mall_builder_quotes set status = 'accepted', order_id = v_order, closed_at = now() where id = p_quote_id;
  return query select v_order, v_no;
end;
$$;
