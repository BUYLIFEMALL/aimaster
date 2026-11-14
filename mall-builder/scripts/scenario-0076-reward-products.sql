-- 0076 리워드 상품(본사 상품 리셀러율·추가율 중복 차단) 시나리오(로컬 Docker 전용, 단독). 0074 시나리오의 준비 부분 재사용
-- 몰 scn(대표 a1, 수수료율 방식 본사 3%), 공급사 b1, 리셀러 R1(손님 c1·f1, 추가율 2%), 구매자 c4(f4), 다른 사람 e9
\set ON_ERROR_STOP 1
insert into auth.users (id, email) select ('00000000-0000-0000-0000-0000000000' || x)::uuid, x || '@x.test' from unnest(array['a1','b1','f1','f4','e9']) x;
insert into public.profiles (id, email) select ('00000000-0000-0000-0000-0000000000' || x)::uuid, x || '@x.test' from unnest(array['a1','b1','f1','f4','e9']) x;
insert into mall_builder_stores (id, name, owner_id, slug, status) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','scn','active');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner');
insert into mall_builder_suppliers (id, store_id, name, email, user_id, status) values ('00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000005a','가나상사','b1@x.test','00000000-0000-0000-0000-0000000000b1','active');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f1','리셀러','010-1111-2222'),
 ('00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f4','구매자','010-4444-5555');
insert into mall_builder_resellers (id, store_id, customer_id, code, rate, active) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000c1','RSLR01',2,true);
grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;

-- 상품: 공급사 P(10,000원, 상품 리셀러율 10%), 본사 H(5,000원, 상품 리셀러율 없음)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select mall_builder_supply_settings_save('00000000-0000-0000-0000-00000000005a', 'rate', 3);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1', false);
select mall_builder_supplier_product_save('00000000-0000-0000-0000-00000000005a', null, '{"name":"티셔츠","supply_price":"9999","base_price":"10000","stock_mode":"none","images":[]}'::jsonb) as pid \gset
select mall_builder_product_reseller_rate_set(:'pid', 10);
reset role;
insert into mall_builder_products (id, store_id, name, base_price) values ('00000000-0000-0000-0000-0000000000d9','00000000-0000-0000-0000-00000000005a','본사 컵',5000);
update mall_builder_products set status = 'on_sale', approval = 'approved' where store_id = '00000000-0000-0000-0000-00000000005a';

-- 주문 만들기 도우미(링크 머리글 + 품목)
create or replace function pg_temp.ord(p_n int, p_hdr text, p_coupon bigint, p_items jsonb) returns uuid language plpgsql as $f$
declare v uuid := gen_random_uuid(); it jsonb; v_sub bigint := 0;
begin
  perform set_config('request.headers', case when p_hdr is null then '{}' else json_build_object('x-mb-ref', p_hdr)::text end, false);
  for it in select * from jsonb_array_elements(p_items) loop v_sub := v_sub + (it->>'line')::bigint; end loop;
  insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, subtotal, shipping_fee, total, coupon_discount)
  values (v, '00000000-0000-0000-0000-00000000005a', p_n, 'T-' || p_n, '00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000c4',
          '{"zip":"63100"}', '홍길동', v_sub, 3000, v_sub + 3000 - p_coupon, p_coupon);
  for it in select * from jsonb_array_elements(p_items) loop
    insert into mall_builder_order_items (order_id, product_id, name_snapshot, unit_price, qty, line_total, coupon_eligible)
    values (v, (it->>'pid')::uuid, it->>'name', (it->>'line')::bigint / (it->>'qty')::int, (it->>'qty')::int, (it->>'line')::bigint, true);
  end loop;
  return v;
end $f$;

-- 1 남은 일괄 지정 못 함
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e9', false);
set role authenticated;
do $$ begin perform mall_builder_reward_products_set('00000000-0000-0000-0000-00000000005a', array['00000000-0000-0000-0000-0000000000d9']::uuid[], 5, null); raise notice '1a 남 — 통과됨(문제)'; exception when others then raise notice '1a 막힘: %', sqlerrm; end $$;
reset role;
-- 2 대표: 두 상품에 율 5% 일괄 → 본사 상품만 바뀜(공급사 상품은 공급사율 그대로), 공급사 상품은 중복 차단 켬
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select '2 율 일괄' t, mall_builder_reward_products_set('00000000-0000-0000-0000-00000000005a', array[:'pid', '00000000-0000-0000-0000-0000000000d9']::uuid[], 5, null) n;
select '2b 중복 차단' t, mall_builder_reward_products_set('00000000-0000-0000-0000-00000000005a', array[:'pid']::uuid[], null, true) n;
reset role;
select '2c 상품' t, name, reward_rate, reward_no_extra from mall_builder_products order by name;
-- 3 링크 주문 P×1(10,000) + H×1(5,000) → 결제 → P = 10%(추가율 막힘) 1,000 / H = 5% + 2% = 350
select pg_temp.ord(1, 'scn=RSLR01', 0, jsonb_build_array(jsonb_build_object('pid', :'pid', 'name', '티셔츠', 'qty', 1, 'line', 10000), jsonb_build_object('pid', '00000000-0000-0000-0000-0000000000d9', 'name', '본사 컵', 'qty', 1, 'line', 5000))) as oa \gset
update mall_builder_orders set status = 'paid' where id = :'oa';
select '3 지급 예정' t, name_snapshot, base_amount, product_rate, reseller_rate, amount from mall_builder_reseller_rewards order by name_snapshot;
