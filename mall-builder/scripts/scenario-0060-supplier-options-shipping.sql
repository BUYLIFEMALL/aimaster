-- 0060 동작 시나리오(로컬 Docker 전용, 2026-11-13). 쓰는 법: 시험 DB에 흉내 틀+묶음을 적용한 뒤 psql -f 로 실행. 기대값은 각 줄 번호 옆 docs/PLAN_20261113_T1_SUPPLIER_OPTIONS_SHIPPING.md §6
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test'),('00000000-0000-0000-0000-0000000000b1','sup@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test'),('00000000-0000-0000-0000-0000000000b1','sup@x.test');
insert into mall_builder_stores (id, name, owner_id, slug, status) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','scn','active');
insert into mall_builder_suppliers (id, store_id, name, email, user_id, status) values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','가나상사','sup@x.test','00000000-0000-0000-0000-0000000000b1','active');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1', false);
select mall_builder_supplier_product_save('00000000-0000-0000-0000-00000000005a', null, '{"name":"티셔츠","supply_price":"10000","base_price":"13000","stock_mode":"none","images":[]}'::jsonb) as pid \gset
select '1 옵션 저장' t, mall_builder_supplier_options_save(:'pid', '[{"name":"색상","values":["빨강","파랑"]}]', '[{"key":"빨강","values":["빨강"],"extra_supply":0,"stock":5},{"key":"파랑","values":["파랑"],"extra_supply":1000,"stock":5}]');
select '2 판매추가금 기본값' t, key, extra_price from mall_builder_product_variants where product_id=:'pid' order by sort;
select '3 재고만' t, mall_builder_supplier_options_save(:'pid', '[{"name":"색상","values":["빨강","파랑"]}]', '[{"key":"빨강","values":["빨강"],"extra_supply":0,"stock":9},{"key":"파랑","values":["파랑"],"extra_supply":1000,"stock":9}]');
select '4 배송비' t, mall_builder_supplier_shipping_save('00000000-0000-0000-0000-00000000005a', '{"type":"conditional","base_fee":"3000","free_over":"50000","jeju_fee":"3000"}') is not null;
select '5 상품 정책' t, (select sp.name from mall_builder_shipping_policies sp where sp.id = p.shipping_policy_id) from mall_builder_products p where id=:'pid';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '6 승인' t, mall_builder_product_review(:'pid','approve','',13000,true);
select '7 판매추가금' t, mall_builder_variant_prices_set(:'pid','{"파랑":1500}');
do $$ begin perform mall_builder_variant_prices_set((select id from mall_builder_products where name='티셔츠'),'{"파랑":-3000}'); raise notice '8 하한 실패해야 함 — 통과됨(문제)'; exception when others then raise notice '8 하한 막힘: %', sqlerrm; end $$;
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor) values ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000005a',1,'T-1','00000000-0000-0000-0000-0000000000a1','{"zip":"63100"}','홍길동');
insert into mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, unit_price, qty, line_total, shipping_policy_id)
  select '00000000-0000-0000-0000-0000000000d1', :'pid', v.id, '티셔츠', 14500, 2, 29000, p.shipping_policy_id from mall_builder_product_variants v join mall_builder_products p on p.id=v.product_id where v.product_id=:'pid' and v.key='파랑';
update mall_builder_orders set subtotal=29000, shipping_fee=6000, total=35000 where id='00000000-0000-0000-0000-0000000000d1';
select '9 품목 공급가' t, supply_price from mall_builder_order_item_supply where order_id='00000000-0000-0000-0000-0000000000d1';
select '10 공급사 배송비' t, amount from mall_builder_order_supplier_shipping;
update mall_builder_orders set status='confirmed' where id='00000000-0000-0000-0000-0000000000d1';
select '11 정산' t, kind, amount, note from mall_builder_supplier_ledger;
update mall_builder_orders set status='returned' where id='00000000-0000-0000-0000-0000000000d1';
select '12 회수' t, kind, amount from mall_builder_supplier_ledger order by created_at, kind;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1', false);
select '13 몰 기본으로' t, mall_builder_supplier_shipping_save('00000000-0000-0000-0000-00000000005a','{"type":"mall"}'), (select shipping_policy_id from mall_builder_products where id=:'pid');
select '14 옵션 추가공급가 변경' t, mall_builder_supplier_options_save(:'pid', '[{"name":"색상","values":["빨강","파랑"]}]', '[{"key":"빨강","values":["빨강"],"extra_supply":0,"stock":9},{"key":"파랑","values":["파랑"],"extra_supply":2000,"stock":9}]'), (select extra_price from mall_builder_product_variants where product_id=:'pid' and key='파랑');
