-- 0067 분양 수수료율 시나리오(로컬 Docker 전용). 0061 → 0062 시나리오 뒤에 같은 시험 DB에서 psql -f
-- 본사 대표 a1, 분양자 e1, 분양몰 my-shop, 원본 상품 c1
\set ON_ERROR_STOP 1
grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;

-- 1 기본 수수료율: 본사 몰 10%, 분양몰은 본사 기본값을 따름
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '1 기본율' t, (select resale_commission_rate from mall_builder_stores where kind='standard' and id=(select source_store_id from mall_builder_stores where slug='my-shop')) hq,
  mall_builder_resale_rate_of((select id from mall_builder_stores where slug='my-shop')) shop;

-- 2 담기 = 본사 판매가 그대로(인상률 30을 줘도 무시)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
select '2 담기' t, mall_builder_resale_add((select id from mall_builder_stores where slug='my-shop'), array['00000000-0000-0000-0000-0000000000c1']::uuid[], 30) added;
select '2 가격' t, (select base_price from mall_builder_products where id='00000000-0000-0000-0000-0000000000c1') src,
  (select base_price from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000c1') mirror;

-- 3 분양자 판매가 바꾸기 막힘
do $$ begin perform mall_builder_resale_price((select id from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000c1'), 99999); raise notice '3 판매가 바꾸기 — 통과됨(문제)'; exception when others then raise notice '3 막힘: %', sqlerrm; end $$;

-- 4 분양자가 자기 수수료율을 직접 바꾸기 / 함수로 바꾸기 → 둘 다 막힘
set role authenticated;
do $$ begin update public.mall_builder_stores set resale_commission_rate = 50 where slug='my-shop'; raise notice '4a 직접 수정 — 통과됨(문제)'; exception when others then raise notice '4a 막힘: %', sqlerrm; end $$;
do $$ begin perform mall_builder_resale_set_rate((select id from mall_builder_stores where slug='my-shop'), 50); raise notice '4b 함수 — 통과됨(문제)'; exception when others then raise notice '4b 막힘: %', sqlerrm; end $$;

reset role;
select '4 결과' t, resale_commission_rate from mall_builder_stores where slug='my-shop';
-- 5 본사 판매가를 내리고 올리면 거울도 그대로 따라감
reset role;
update mall_builder_products set base_price = base_price - 1000 where id='00000000-0000-0000-0000-0000000000c1';
select '5 내림' t, (select base_price from mall_builder_products where id='00000000-0000-0000-0000-0000000000c1') src,
  (select base_price from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000c1') mirror;
update mall_builder_products set base_price = base_price + 3000 where id='00000000-0000-0000-0000-0000000000c1';
select '5 올림' t, (select base_price from mall_builder_products where id='00000000-0000-0000-0000-0000000000c1') src,
  (select base_price from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000c1') mirror;

-- 6 본사가 이 분양몰만 12.5%로
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select mall_builder_resale_set_rate((select id from mall_builder_stores where slug='my-shop'), 12.5);
select '6 몰별 수수료율' t, mall_builder_resale_rate_of((select id from mall_builder_stores where slug='my-shop')) rate;

-- 7 주문 → 입금 확인 → 배송 완료 → 구매 확정 → 수수료 = (결제 − 배송비) × 12.5%
reset role;
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor) values ('00000000-0000-0000-0000-0000000000f7',(select id from mall_builder_stores where slug='my-shop'),7,'R-7','00000000-0000-0000-0000-0000000000a1','{"zip":"10228","receiver":"손님"}','손님');
insert into mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total)
  select '00000000-0000-0000-0000-0000000000f7', m.id, v.id, m.name, v.key, m.base_price + v.extra_price, 2, (m.base_price + v.extra_price) * 2
    from mall_builder_products m join mall_builder_product_variants v on v.product_id = m.id and v.key='흰색' where m.source_product_id='00000000-0000-0000-0000-0000000000c1';
update mall_builder_orders o set subtotal = x.s, shipping_fee = 3000, total = x.s + 3000
  from (select sum(line_total) s from mall_builder_order_items where order_id='00000000-0000-0000-0000-0000000000f7') x where o.id='00000000-0000-0000-0000-0000000000f7';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '7 입금 확인' t, mall_builder_resale_confirm_payment('00000000-0000-0000-0000-0000000000f7') is not null ok;
reset role;
update mall_builder_orders set status='delivered' where resale_order_id='00000000-0000-0000-0000-0000000000f7';
update mall_builder_orders set status='confirmed' where id='00000000-0000-0000-0000-0000000000f7';
select '7 수수료' t, o.total, o.shipping_fee, floor((o.total - o.shipping_fee) * 12.5 / 100.0)::bigint expected,
  (select amount from mall_builder_resale_ledger l where l.order_id=o.id and l.kind='earn') earned,
  (select note from mall_builder_resale_ledger l where l.order_id=o.id and l.kind='earn') note
  from mall_builder_orders o where o.id='00000000-0000-0000-0000-0000000000f7';

-- 8 반품 → 회수
update mall_builder_orders set status='returned' where id='00000000-0000-0000-0000-0000000000f7';
select '8 회수' t, (select amount from mall_builder_resale_ledger l where l.order_id='00000000-0000-0000-0000-0000000000f7' and l.kind='reclaim') reclaim;

-- 9 리셀러 코어 계산식 그대로: (100,000 − 3,000) × 7% = 6,790
select '9 코어' t, mall_builder_private.commission_of(100000, 3000, 7) v, position('commission_of' in pg_get_functiondef('public.mall_builder_orders_reseller()'::regprocedure)) > 0 reseller_uses_core;
