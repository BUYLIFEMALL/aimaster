-- AI 쇼핑몰 빌더 — 배송비 정책 종류 확장(스마트스토어 상품등록 자동화 기준) (2026-11-14)
-- 설계 docs/PLAN_20261113_SHIPPING_POLICY_TYPES.md. 주인님 결정: 수량별·구간별·묶음배송 불가·반품/교환 배송비 모두 추가.
--  · 수량별(quantity): repeat_qty개마다 기본 배송비를 다시 매김(4개·3개마다 3,000원 → 6,000원)
--  · 구간별(range): range_upto개까지 기본 배송비, 넘으면 range_extra_fee를 한 번 더
--  · 묶음배송(bundle=false): 같은 정책이어도 상품마다 따로 매김
--  · 반품(편도)·교환(왕복) 배송비: 정책에 저장(안내·교환/반품 처리 기본값). 계산에는 쓰지 않음
-- 계산은 함수 두 개로 모으고(shipping_group_key·shipping_qty_fee), 배송비를 계산하는 주문 함수 6개의 정해진 문구만 바꿔 끼운다(문구가 정확히 1번 있을 때만).
-- 공급사 배송비 정책은 지금처럼 무료·고정·조건부 무료 + 묶음만(제약으로 막음) → 공급사 정산 트리거는 바꾸지 않는다.
-- 추가·함수 일부 바꾸기만(drop 없음, 기존 정책·지난 주문 금액 그대로).

alter table public.mall_builder_shipping_policies add column if not exists repeat_qty integer;
alter table public.mall_builder_shipping_policies add column if not exists range_upto integer;
alter table public.mall_builder_shipping_policies add column if not exists range_extra_fee bigint not null default 0;
alter table public.mall_builder_shipping_policies add column if not exists bundle boolean not null default true;
alter table public.mall_builder_shipping_policies add column if not exists return_fee bigint;
alter table public.mall_builder_shipping_policies add column if not exists exchange_fee bigint;

alter table public.mall_builder_shipping_policies drop constraint if exists mall_builder_shipping_policies_type_check;
alter table public.mall_builder_shipping_policies add constraint mall_builder_shipping_policies_type_check
  check (type in ('free', 'fixed', 'conditional', 'quantity', 'range'));
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_shipping_policies_qty_rules') then
    alter table public.mall_builder_shipping_policies add constraint mall_builder_shipping_policies_qty_rules check (
      (type <> 'quantity' or coalesce(repeat_qty, 0) between 1 and 999)
      and (type <> 'range' or coalesce(range_upto, 0) between 1 and 999)
      and range_extra_fee between 0 and 1000000
      and (return_fee is null or return_fee between 0 and 1000000)
      and (exchange_fee is null or exchange_fee between 0 and 1000000));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_shipping_policies_supplier_basic') then
    alter table public.mall_builder_shipping_policies add constraint mall_builder_shipping_policies_supplier_basic
      check (supplier_id is null or (type in ('free', 'fixed', 'conditional') and bundle));
  end if;
end $c$;

-- 묶음 열쇠: 정책 없음 → 'none', 묶음 불가 정책 → '<정책>|<상품>', 그 밖 → '<정책>'
create or replace function mall_builder_private.shipping_group_key(p_policy uuid, p_product uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when p_policy is null then 'none'
    when exists (select 1 from public.mall_builder_shipping_policies sp where sp.id = p_policy and not sp.bundle)
      then p_policy::text || '|' || coalesce(p_product::text, '')
    else p_policy::text end;
$$;

-- 수량별·구간별 배송비(제주·도서산간 추가는 부르는 쪽에서 더함)
create or replace function mall_builder_private.shipping_qty_fee(p public.mall_builder_shipping_policies, p_qty bigint)
returns bigint language sql immutable set search_path = '' as $$
  select case p.type
    when 'quantity' then p.base_fee * ceil(greatest(coalesce(p_qty, 0), 1)::numeric / greatest(coalesce(p.repeat_qty, 1), 1))::bigint
    when 'range' then p.base_fee + case when coalesce(p_qty, 0) > coalesce(p.range_upto, 0) then p.range_extra_fee else 0 end
    else 0 end;
$$;

create or replace function pg_temp.swap(src text, a text, b text, what text) returns text language plpgsql as $f$
begin
  if (char_length(src) - char_length(replace(src, a, ''))) / char_length(a) <> 1 then raise exception '문구를 1번 찾지 못함: %', what; end if;
  return replace(src, a, b);
end $f$;

-- 주문 함수 공통 바꾸기: 수량 묶음 변수, 묶음 열쇠, 수량 더하기, 정책 찾기, 수량별·구간별 계산
create or replace function pg_temp.ship_patch(sig text, key_from text, key_to text, qty_expr text) returns void language plpgsql as $f$
declare src text;
begin
  src := pg_get_functiondef(sig::regprocedure);
  src := pg_temp.swap(src, 'v_groups jsonb := ''{}''::jsonb;', 'v_groups jsonb := ''{}''::jsonb;' || chr(10) || '  v_gqty jsonb := ''{}''::jsonb;', sig || ' 변수');
  src := pg_temp.swap(src, key_from, key_to, sig || ' 열쇠');
  src := pg_temp.swap(src, 'v_groups := jsonb_set(v_groups, array[v_key],',
    'v_gqty := jsonb_set(v_gqty, array[v_key], to_jsonb(coalesce((v_gqty ->> v_key)::bigint, 0) + ' || qty_expr || ')); v_groups := jsonb_set(v_groups, array[v_key],', sig || ' 수량');
  src := pg_temp.swap(src, 'where sp.id = v_key::uuid;', 'where sp.id = split_part(v_key, ''|'', 1)::uuid;', sig || ' 정책 찾기');
  src := pg_temp.swap(src, 'when ''conditional'' then case when v_policy.free_over is not null and (v_groups ->> v_key)::bigint >= v_policy.free_over then 0 else v_policy.base_fee end',
    'when ''conditional'' then case when v_policy.free_over is not null and (v_groups ->> v_key)::bigint >= v_policy.free_over then 0 else v_policy.base_fee end'
    || chr(10) || '      when ''quantity'' then mall_builder_private.shipping_qty_fee(v_policy, (v_gqty ->> v_key)::bigint)'
    || chr(10) || '      when ''range'' then mall_builder_private.shipping_qty_fee(v_policy, (v_gqty ->> v_key)::bigint)', sig || ' 계산');
  execute src;
end $f$;

do $m$
declare
  k_line text := 'v_key := coalesce(coalesce(v_line.shipping_policy_id, v_default)::text, ''none'');';
  k_line_to text := 'v_key := mall_builder_private.shipping_group_key(coalesce(v_line.shipping_policy_id, v_default), v_line.product_id);';
  src text;
begin
  perform pg_temp.ship_patch('public.mall_builder_place_order(uuid,uuid,text,text,bigint)', k_line, k_line_to, 'v_line.qty');
  perform pg_temp.ship_patch('public.mall_builder_place_order_v2(uuid,uuid,text,text,bigint,text,uuid,bigint)', k_line, k_line_to, 'v_line.qty');
  perform pg_temp.ship_patch('public.mall_builder_place_guest_order(uuid,jsonb,jsonb,jsonb,text,text,bigint)', k_line, k_line_to, 'v_line.qty');
  perform pg_temp.ship_patch('public.mall_builder_order_from_quote(uuid,uuid,text,text,bigint)', k_line, k_line_to, 'v_line.qty');
  perform pg_temp.ship_patch('public.mall_builder_order_from_quote(uuid,uuid,text,text,bigint,text)', k_line, k_line_to, 'v_line.qty');

  -- 부분 취소: 남은 수량·상품을 함께 읽은 뒤 같은 바꾸기
  src := pg_get_functiondef('public.mall_builder_cancel_order_items(uuid,jsonb,text)'::regprocedure);
  src := pg_temp.swap(src, 'as amount, i.shipping_policy_id from public.mall_builder_order_items i where i.order_id = p_order_id loop',
                           'as amount, i.shipping_policy_id, i.product_id, (i.qty - i.cancelled_qty) as left_qty from public.mall_builder_order_items i where i.order_id = p_order_id loop', '부분 취소 읽기');
  execute src;
  perform pg_temp.ship_patch('public.mall_builder_cancel_order_items(uuid,jsonb,text)',
    'v_key := coalesce(r.shipping_policy_id::text, ''none'');',
    'v_key := mall_builder_private.shipping_group_key(r.shipping_policy_id, r.product_id);', 'r.left_qty');

  -- 몰 설정 복사·분양몰 정책 복사·동기화: 새 칸도 함께
  src := pg_get_functiondef('public.mall_builder_copy_store_setup(uuid,uuid,text[])'::regprocedure);
  src := pg_temp.swap(src, '(store_id, name, type, base_fee, free_over, jeju_fee, island_fee, is_default)',
    '(store_id, name, type, base_fee, free_over, jeju_fee, island_fee, repeat_qty, range_upto, range_extra_fee, bundle, return_fee, exchange_fee, is_default)', '설정 복사 칸');
  src := pg_temp.swap(src, 'select p_to, name, type, base_fee, free_over, jeju_fee, island_fee, is_default from',
    'select p_to, name, type, base_fee, free_over, jeju_fee, island_fee, repeat_qty, range_upto, range_extra_fee, bundle, return_fee, exchange_fee, is_default from', '설정 복사 값');
  execute src;

  src := pg_get_functiondef('mall_builder_private.resale_policy_for(uuid,public.mall_builder_products)'::regprocedure);
  src := pg_temp.swap(src, '(store_id, name, type, base_fee, free_over, jeju_fee, island_fee, is_default, source_policy_id)',
    '(store_id, name, type, base_fee, free_over, jeju_fee, island_fee, repeat_qty, range_upto, range_extra_fee, bundle, return_fee, exchange_fee, is_default, source_policy_id)', '분양 정책 칸');
  src := pg_temp.swap(src, 'v_src.jeju_fee, v_src.island_fee, false, v_src.id)',
    'v_src.jeju_fee, v_src.island_fee, v_src.repeat_qty, v_src.range_upto, v_src.range_extra_fee, v_src.bundle, v_src.return_fee, v_src.exchange_fee, false, v_src.id)', '분양 정책 값');
  execute src;

  src := pg_get_functiondef('public.mall_builder_policies_resale_sync()'::regprocedure);
  src := pg_temp.swap(src, 'island_fee = new.island_fee',
    'island_fee = new.island_fee, repeat_qty = new.repeat_qty, range_upto = new.range_upto, range_extra_fee = new.range_extra_fee, bundle = new.bundle, return_fee = new.return_fee, exchange_fee = new.exchange_fee', '분양 정책 동기화');
  execute src;
end $m$;

revoke all on function mall_builder_private.shipping_group_key(uuid, uuid) from public, anon, authenticated;
revoke all on function mall_builder_private.shipping_qty_fee(public.mall_builder_shipping_policies, bigint) from public, anon, authenticated;
