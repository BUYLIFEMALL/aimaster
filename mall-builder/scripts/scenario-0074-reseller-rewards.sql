-- 0074 리셀러 리워드 품목·상태 시나리오(로컬 Docker 전용, 단독). 흉내 틀 + 묶음 적용 뒤 psql -f
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

-- A: 링크 주문 P×2(20,000) + H×1(5,000), 쿠폰 2,500 → 결제 확인 때 지급 예정
select pg_temp.ord(1, 'scn=RSLR01', 2500, jsonb_build_array(jsonb_build_object('pid', :'pid', 'name', '티셔츠', 'qty', 2, 'line', 20000), jsonb_build_object('pid', '00000000-0000-0000-0000-0000000000d9', 'name', '본사 컵', 'qty', 1, 'line', 5000))) as oa \gset
select '1 입금 전 리워드 수' t, count(*) from mall_builder_reseller_rewards;
update mall_builder_orders set status = 'paid' where id = :'oa';
select '2 지급 예정' t, name_snapshot, base_amount, product_rate, reseller_rate, amount, status from mall_builder_reseller_rewards where order_id = :'oa' order by name_snapshot;
update mall_builder_orders set status = 'confirmed' where id = :'oa';
select '3 확정 → 지급 완료' t, status, count(*), sum(amount) from mall_builder_reseller_rewards where order_id = :'oa' group by status;
select '3b 장부' t, kind, amount, balance_after from mall_builder_reseller_ledger order by created_at;

-- B: 링크 주문 P×1 결제 → 확정 전 취소 → 보류 → 대표가 지급
select pg_temp.ord(2, 'scn=RSLR01', 0, jsonb_build_array(jsonb_build_object('pid', :'pid', 'name', '티셔츠', 'qty', 1, 'line', 10000))) as ob \gset
update mall_builder_orders set status = 'paid' where id = :'ob';
update mall_builder_orders set status = 'cancelled' where id = :'ob';
select '4 보류' t, status, amount, note from mall_builder_reseller_rewards where order_id = :'ob';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e9', false);
set role authenticated;
do $$ begin perform mall_builder_reward_decide((select id from mall_builder_reseller_rewards where status = 'held' limit 1), 'pay', ''); raise notice '5a 남이 지급 — 통과됨(문제)'; exception when others then raise notice '5a 막힘: %', sqlerrm; end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select '5 대표 지급' t, mall_builder_reward_decide((select id from mall_builder_reseller_rewards where status = 'held' limit 1), 'pay', '고객 재구매 확인');
reset role;
select '5b 상태·잔고' t, (select status from mall_builder_reseller_rewards where order_id = :'ob'), (select balance_after from mall_builder_reseller_ledger order by created_at desc, id desc limit 1);

-- C: P×2(20,000) 결제 → 1개 부분 취소 → 확정 → 남은 10,000 기준 1,200
select pg_temp.ord(3, 'scn=RSLR01', 0, jsonb_build_array(jsonb_build_object('pid', :'pid', 'name', '티셔츠', 'qty', 2, 'line', 20000))) as oc \gset
update mall_builder_orders set status = 'paid' where id = :'oc';
update mall_builder_order_items set cancelled_qty = 1 where order_id = :'oc';
update mall_builder_orders set status = 'confirmed' where id = :'oc';
select '6 부분 취소 반영' t, base_amount, amount, status from mall_builder_reseller_rewards where order_id = :'oc';

-- D: 링크 없는 주문 → 리워드 없음
select pg_temp.ord(4, null, 0, jsonb_build_array(jsonb_build_object('pid', :'pid', 'name', '티셔츠', 'qty', 1, 'line', 10000))) as od \gset
update mall_builder_orders set status = 'paid' where id = :'od';
update mall_builder_orders set status = 'confirmed' where id = :'od';
select '7 링크 없음' t, count(*) from mall_builder_reseller_rewards where order_id = :'od';

-- 8 확정 뒤 반품 → 자동 회수 없음(지급 완료 그대로)
update mall_builder_orders set status = 'returned' where id = :'oa';
select '8 확정 뒤 반품' t, (select count(*) from mall_builder_reseller_ledger where kind = 'reclaim') reclaim, (select count(*) from mall_builder_reseller_rewards where order_id = :'oa' and status = 'paid') still_paid;

-- 9 직권 차감: 잔고보다 큰 차감은 막힘, 사유 없으면 막힘, 정상 차감
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
do $$ begin perform mall_builder_reseller_adjust('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000e1', -999999, '반품 차감'); raise notice '9a 음수 잔고 — 통과됨(문제)'; exception when others then raise notice '9a 막힘: %', sqlerrm; end $$;
do $$ begin perform mall_builder_reseller_adjust('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000e1', -100, ''); raise notice '9b 사유 없음 — 통과됨(문제)'; exception when others then raise notice '9b 막힘: %', sqlerrm; end $$;
select '9 직권 차감' t, mall_builder_reseller_adjust('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000e1', -2250, '주문 T-1 확정 뒤 반품 — 리워드 회수') bal;
reset role;
select '10 최종 잔고' t, sum(amount) from mall_builder_reseller_ledger;
