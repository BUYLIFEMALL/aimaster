-- AI 쇼핑몰 빌더 D4 — 운영자가 먼저 견적 보내기
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(칸 1개·함수 1개). 지우기 문장 없음.
-- 적용 이름: mall_builder_0020_send_quote
-- 만든 견적은 바로 「회신됨(answered)」 — 손님은 기존 견적 화면에서 견적가 그대로 주문(무통장·외상)하거나 거절한다.

alter table public.mall_builder_quotes add column if not exists origin text not null default 'customer' check (origin in ('customer', 'staff'));

-- 운영자: 손님 한 명에게 견적 보내기. p_items = [{product_id, variant_id|null, qty, price}] (앱 validateSendItems로 한 번 정리된 값)
create or replace function public.mall_builder_send_quote(p_store_id uuid, p_customer_id uuid, p_items jsonb, p_valid_until date, p_note text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_customer public.mall_builder_store_customers%rowtype;
  v_seq integer;
  v_quote uuid;
  v_it jsonb;
  v_p public.mall_builder_products%rowtype;
  v_v public.mall_builder_product_variants%rowtype;
  v_qty integer;
  v_price bigint;
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰에서 견적을 보낼 권한이 없습니다.'; end if;
  perform 1 from public.mall_builder_stores s where s.id = p_store_id for update;
  select * into v_customer from public.mall_builder_store_customers c where c.id = p_customer_id and c.store_id = p_store_id;
  if not found then raise exception '이 몰의 손님이 아닙니다.'; end if;
  if p_valid_until is null or p_valid_until < (now() at time zone 'Asia/Seoul')::date or p_valid_until > (now() at time zone 'Asia/Seoul')::date + 90 then
    raise exception '유효기한은 오늘부터 90일 이내로 정해 주세요.';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception '메모는 500자 이내로 입력해 주세요.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception '견적 품목은 1~30개입니다.'; end if;

  select coalesce(max(q.seq), 0) + 1 into v_seq from public.mall_builder_quotes q where q.store_id = p_store_id;
  insert into public.mall_builder_quotes (store_id, seq, quote_no, user_id, customer_id, status, answer_note, valid_until, answered_at, origin)
  values (p_store_id, v_seq, 'Q' || to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0'),
          v_customer.user_id, v_customer.id, 'answered', coalesce(btrim(p_note), ''), p_valid_until, now(), 'staff')
  returning id into v_quote;

  for v_it in select * from jsonb_array_elements(p_items) loop
    v_count := v_count + 1;
    select * into v_p from public.mall_builder_products p where p.id = (v_it ->> 'product_id')::uuid and p.store_id = p_store_id;
    if not found then raise exception '%번째 품목의 상품을 찾을 수 없습니다.', v_count; end if;
    if v_p.status not in ('on_sale', 'sold_out') then raise exception '「%」은(는) 판매 중이 아닙니다.', v_p.name; end if;
    v_v := null;
    if coalesce(v_it ->> 'variant_id', '') <> '' then
      select * into v_v from public.mall_builder_product_variants v where v.id = (v_it ->> 'variant_id')::uuid and v.product_id = v_p.id and v.is_active;
      if not found then raise exception '「%」의 옵션을 다시 골라 주세요.', v_p.name; end if;
    elsif jsonb_array_length(coalesce(v_p.option_groups, '[]'::jsonb)) > 0 then
      raise exception '「%」의 옵션을 골라 주세요.', v_p.name;
    end if;
    if (v_it ->> 'qty') !~ '^[0-9]+$' or (v_it ->> 'price') !~ '^[0-9]+$' then raise exception '%번째 품목의 수량·견적가를 확인해 주세요.', v_count; end if;
    v_qty := (v_it ->> 'qty')::integer;
    v_price := (v_it ->> 'price')::bigint;
    if v_qty not between 1 and 999 or v_price > 1000000000 then raise exception '%번째 품목의 수량·견적가를 확인해 주세요.', v_count; end if;
    insert into public.mall_builder_quote_items (quote_id, product_id, variant_id, name_snapshot, option_snapshot, qty, ref_unit_price, quoted_price)
    values (v_quote, v_p.id, v_v.id, v_p.name, coalesce(v_v.key, ''), v_qty, v_p.base_price + coalesce(v_v.extra_price, 0), v_price);
  end loop;
  return v_quote;
end;
$$;
