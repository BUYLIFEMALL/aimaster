-- 0063 분양몰 주문 전달·연동·마진 시나리오(로컬 Docker 전용). 0061 → 0062 시나리오 뒤에 같은 시험 DB에서 psql -f
\set ON_ERROR_STOP 1
grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
select mall_builder_resale_add((select id from mall_builder_stores where slug='my-shop'), array['00000000-0000-0000-0000-0000000000c1']::uuid[], 0) as added;
select mall_builder_resale_price((select id from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000c1'), 21000);
-- 분양몰 손님 주문(주문 함수 대신 직접 넣음): 분홍 2개
reset role;
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor) values ('00000000-0000-0000-0000-0000000000d9',(select id from mall_builder_stores where slug='my-shop'),1,'R-1','00000000-0000-0000-0000-0000000000a1','{"zip":"10228","receiver":"손님"}','손님');
insert into mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total, shipping_policy_id)
  select '00000000-0000-0000-0000-0000000000d9', m.id, v.id, m.name, v.key, m.base_price + v.extra_price, 2, (m.base_price + v.extra_price) * 2, m.shipping_policy_id
    from mall_builder_products m join mall_builder_product_variants v on v.product_id = m.id and v.key='분홍' where m.source_product_id='00000000-0000-0000-0000-0000000000c1';
update mall_builder_orders set subtotal=43400, shipping_fee=3500, total=46900 where id='00000000-0000-0000-0000-0000000000d9';
-- 분양자가 입금 확인을 시도
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
do $$ begin update public.mall_builder_orders set status='paid' where id='00000000-0000-0000-0000-0000000000d9'; raise notice '1 분양자 입금 확인(권한 높은 함수 경로) — 통과됨(문제)'; exception when others then raise notice '1 막힘: %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '2 본사 목록' t, order_no, status, margin from mall_builder_resale_orders('00000000-0000-0000-0000-00000000005a');
select '3 입금 확인' t, mall_builder_resale_confirm_payment('00000000-0000-0000-0000-0000000000d9') is not null as ok;
select '4 전달 주문' t, h.order_no, h.status, h.subtotal, h.shipping_fee, h.depositor, (select string_agg(i.option_snapshot||' '||i.unit_price||'x'||i.qty, ',') from mall_builder_order_items i where i.order_id=h.id) items
  from mall_builder_orders h where h.resale_order_id='00000000-0000-0000-0000-0000000000d9';
select '5 재고' t, (select stock from mall_builder_product_variants where product_id='00000000-0000-0000-0000-0000000000c1' and key='분홍') src_pink,
  (select v.stock from mall_builder_product_variants v join mall_builder_products m on m.id=v.product_id where m.source_product_id='00000000-0000-0000-0000-0000000000c1' and v.key='분홍') mirror_pink;
update mall_builder_orders set status='shipping', courier='CJ', tracking_no='T-1' where resale_order_id='00000000-0000-0000-0000-0000000000d9';
select '6 분양몰 따라감' t, status, courier, tracking_no from mall_builder_orders where id='00000000-0000-0000-0000-0000000000d9';
update mall_builder_orders set status='delivered' where resale_order_id='00000000-0000-0000-0000-0000000000d9';
update mall_builder_orders set status='confirmed' where id='00000000-0000-0000-0000-0000000000d9';
select '7 확정' t, (select status from mall_builder_orders where resale_order_id='00000000-0000-0000-0000-0000000000d9') hq, (select string_agg(kind||' '||amount, ',') from mall_builder_resale_ledger) ledger;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
do $$ begin perform mall_builder_resale_payout_request((select id from mall_builder_stores where slug='my-shop'), 999999, '{"bank_name":"국민","bank_account":"1","bank_holder":"분양자"}'); raise notice '8 잔액 초과 출금 — 통과됨(문제)'; exception when others then raise notice '8 막힘: %', sqlerrm; end $$;
select mall_builder_resale_payout_request((select id from mall_builder_stores where slug='my-shop'), 10000, '{"bank_name":"국민","bank_account":"1","bank_holder":"분양자"}') as pay \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '9 지급' t, mall_builder_resale_payout_decide(:'pay', 'paid', '이체 완료');
select '10 장부' t, kind, amount, balance_after from mall_builder_resale_ledger order by created_at;
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor) values ('00000000-0000-0000-0000-0000000000da',(select id from mall_builder_stores where slug='my-shop'),2,'R-2','00000000-0000-0000-0000-0000000000a1','{"zip":"10228"}','손님');
insert into mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total)
  select '00000000-0000-0000-0000-0000000000da', m.id, v.id, m.name, v.key, m.base_price, 1, m.base_price from mall_builder_products m join mall_builder_product_variants v on v.product_id=m.id and v.key='흰색' where m.source_product_id='00000000-0000-0000-0000-0000000000c1';
update mall_builder_orders set subtotal=21000, shipping_fee=3500, total=24500 where id='00000000-0000-0000-0000-0000000000da';
select '11 둘째 입금' t, mall_builder_resale_confirm_payment('00000000-0000-0000-0000-0000000000da') is not null as ok,
  (select stock from mall_builder_product_variants where product_id='00000000-0000-0000-0000-0000000000c1' and key='흰색') white_before;
update mall_builder_orders set status='cancelled' where id='00000000-0000-0000-0000-0000000000da';
select '12 취소 후' t, (select status from mall_builder_orders where resale_order_id='00000000-0000-0000-0000-0000000000da') hq,
  (select stock from mall_builder_product_variants where product_id='00000000-0000-0000-0000-0000000000c1' and key='흰색') white_after;
