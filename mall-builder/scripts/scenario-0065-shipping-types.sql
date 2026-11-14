-- 0065 배송비 종류 시나리오(로컬 Docker 전용, 2026-11-14). 0061·0062 시나리오 뒤(본사몰 hq-mall)에서 psql -f 로 실행
-- 기대: 수량별(3개마다 3,000) A2+B2=4개 → 6,000 / 구간별(2개까지 3,000, 넘으면 +4,000) C3개 → 7,000
--       묶음 불가 고정 2,500 D1·E1 → 5,000 / 배송비 합 18,000, 상품 23,000, 합계 41,000
--       부분 취소 B 2개 → 수량별 묶음 2개 → 3,000 → 배송비 15,000
\set ON_ERROR_STOP 1
reset role;
update mall_builder_stores set settings = coalesce(settings, '{}'::jsonb) || '{"guest_order": true}' where slug = 'hq-mall';
insert into mall_builder_shipping_policies (id, store_id, name, type, base_fee, repeat_qty) values
 ('00000000-0000-0000-0000-0000000065a1','00000000-0000-0000-0000-00000000005a','수량별',  'quantity',3000,3);
insert into mall_builder_shipping_policies (id, store_id, name, type, base_fee, range_upto, range_extra_fee) values
 ('00000000-0000-0000-0000-0000000065a2','00000000-0000-0000-0000-00000000005a','구간별',  'range',3000,2,4000);
insert into mall_builder_shipping_policies (id, store_id, name, type, base_fee, bundle, return_fee, exchange_fee) values
 ('00000000-0000-0000-0000-0000000065a3','00000000-0000-0000-0000-00000000005a','개별 배송','fixed',2500,false,3000,6000);
do $$ begin
  insert into mall_builder_shipping_policies (store_id, name, type, base_fee) values ('00000000-0000-0000-0000-00000000005a','수량 빠짐','quantity',3000);
  raise notice '0 수량 없는 수량별 — 통과됨(문제)';
exception when others then raise notice '0 막힘: %', sqlerrm; end $$;
insert into mall_builder_products (id, store_id, name, base_price, status, stock_mode, shipping_policy_id) values
 ('00000000-0000-0000-0000-0000000065b1','00000000-0000-0000-0000-00000000005a','A',1000,'on_sale','none','00000000-0000-0000-0000-0000000065a1'),
 ('00000000-0000-0000-0000-0000000065b2','00000000-0000-0000-0000-00000000005a','B',2000,'on_sale','none','00000000-0000-0000-0000-0000000065a1'),
 ('00000000-0000-0000-0000-0000000065b3','00000000-0000-0000-0000-00000000005a','C',5000,'on_sale','none','00000000-0000-0000-0000-0000000065a2'),
 ('00000000-0000-0000-0000-0000000065b4','00000000-0000-0000-0000-00000000005a','D',1000,'on_sale','none','00000000-0000-0000-0000-0000000065a3'),
 ('00000000-0000-0000-0000-0000000065b5','00000000-0000-0000-0000-00000000005a','E',1000,'on_sale','none','00000000-0000-0000-0000-0000000065a3');

select set_config('request.jwt.claim.sub', '', false);
select '1 비회원 주문' t, mall_builder_place_guest_order('00000000-0000-0000-0000-00000000005a',
  '[{"product_id":"00000000-0000-0000-0000-0000000065b1","qty":2},{"product_id":"00000000-0000-0000-0000-0000000065b2","qty":2},
    {"product_id":"00000000-0000-0000-0000-0000000065b3","qty":3},{"product_id":"00000000-0000-0000-0000-0000000065b4","qty":1},
    {"product_id":"00000000-0000-0000-0000-0000000065b5","qty":1}]',
  '{"name":"손님","phone":"010-1111-2222"}', '{"receiver":"손님","phone":"010-1111-2222","zip":"06236","addr1":"서울 강남"}', '손님', '', 41000) is not null as ok;
select '2 금액' t, o.subtotal, o.shipping_fee, o.total from mall_builder_orders o where o.order_no is not null and o.is_guest order by o.created_at desc limit 1;

-- 부분 취소: B 2개
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '3 부분 취소' t, mall_builder_cancel_order_items(o.id,
  jsonb_build_array(jsonb_build_object('item_id', (select i.id from mall_builder_order_items i where i.order_id = o.id and i.product_id = '00000000-0000-0000-0000-0000000065b2'), 'qty', 2)), '시험') is not null as ok
  from mall_builder_orders o where o.is_guest order by o.created_at desc limit 1;
reset role;
select '4 취소 뒤' t, o.subtotal, o.shipping_fee, o.total from mall_builder_orders o where o.is_guest order by o.created_at desc limit 1;
select '5 묶음 열쇠' t, mall_builder_private.shipping_group_key('00000000-0000-0000-0000-0000000065a3','00000000-0000-0000-0000-0000000065b4') = '00000000-0000-0000-0000-0000000065a3|00000000-0000-0000-0000-0000000065b4' as nobundle_key,
  mall_builder_private.shipping_group_key('00000000-0000-0000-0000-0000000065a1','00000000-0000-0000-0000-0000000065b1') = '00000000-0000-0000-0000-0000000065a1' as bundle_key;
