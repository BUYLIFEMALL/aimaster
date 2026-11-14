-- 0062 거울 상품 시나리오(로컬 Docker 전용). 0061 시나리오 뒤에 이어서(같은 시험 DB) psql -f 로 실행
\set ON_ERROR_STOP 1
-- 0061 시나리오가 끝나 분양몰 my-shop이 있고, 기간을 0일로 끝낸 상태 → 다시 14일
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select mall_builder_resale_set_period((select id from mall_builder_stores where slug='my-shop'), 14) is not null as reopened;
insert into mall_builder_shipping_policies (id, store_id, name, type, base_fee, free_over, is_default) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-00000000005a','본사 기본','conditional',3000,50000,true);
insert into mall_builder_products (id, store_id, name, base_price, status, stock_mode, stock, option_groups) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','물티슈',10000,'on_sale','product',50,'[{"name":"색상","values":["흰색","분홍"]}]'),
 ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-00000000005a','사업자전용',8000,'on_sale','none',0,'[]');
update mall_builder_products set visibility='business_only' where id='00000000-0000-0000-0000-0000000000c2';
insert into mall_builder_product_variants (product_id, store_id, key, "values", extra_price, stock) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','흰색','["흰색"]',0,20),
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','분홍','["분홍"]',500,30);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
select '1 목록' t, name, added from mall_builder_resale_catalog((select id from mall_builder_stores where slug='my-shop'));
select '2 담기(20%)' t, mall_builder_resale_add((select id from mall_builder_stores where slug='my-shop'), array['00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c2']::uuid[], 20);
select '3 거울' t, m.name, m.base_price, m.stock, sp.name ship, sp.base_fee, (select count(*) from mall_builder_product_variants v where v.product_id = m.id) vars
  from mall_builder_products m left join mall_builder_shipping_policies sp on sp.id = m.shipping_policy_id where m.source_product_id is not null;
do $$ begin perform mall_builder_resale_price((select id from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000c1'), 9000); raise notice '4 본사가 밑 판매가 — 통과됨(문제)'; exception when others then raise notice '4 막힘: %', sqlerrm; end $$;
-- 0067(2026-11-14 수수료율 방식) 이후: 분양자 판매가 바꾸기는 막힘 — 판매가 = 본사 판매가
do $$ begin perform mall_builder_resale_price((select id from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000c1'), 13000); raise notice '5 판매가 13000 — 통과됨(0067 이후 문제)'; exception when others then raise notice '5 막힘(0067 정상): %', sqlerrm; end $$;
-- 원본이 바뀜(본사 대표가)
reset role;
update mall_builder_products set name='물티슈 100매', base_price=14000, stock=7 where id='00000000-0000-0000-0000-0000000000c1';
update mall_builder_product_variants set extra_price=700, stock=3 where product_id='00000000-0000-0000-0000-0000000000c1' and key='분홍';
update mall_builder_shipping_policies set base_fee=3500 where id='00000000-0000-0000-0000-0000000000f1';
select '6 반영' t, m.name, m.base_price, m.stock, (select extra_price||'/'||stock from mall_builder_product_variants v where v.product_id=m.id and v.key='분홍') pink, sp.base_fee
  from mall_builder_products m left join mall_builder_shipping_policies sp on sp.id = m.shipping_policy_id where m.source_product_id is not null;
update mall_builder_products set status='hidden' where id='00000000-0000-0000-0000-0000000000c1';
select '7 원본 숨김' t, status from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000c1';
update mall_builder_products set status='on_sale' where id='00000000-0000-0000-0000-0000000000c1';
select '8 원본 다시 판매' t, status from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000c1';
grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
set role authenticated;
do $$ begin insert into public.mall_builder_products (store_id, name, base_price) values ((select id from public.mall_builder_stores where slug='my-shop'), '내 상품', 1000); raise notice '9 분양몰 직접 등록 — 통과됨(문제)'; exception when others then raise notice '9 막힘: %', sqlerrm; end $$;
do $$ begin update public.mall_builder_products set base_price = 100 where source_product_id='00000000-0000-0000-0000-0000000000c1'; raise notice '10 직접 판매가 내림 — 통과됨(문제)'; exception when others then raise notice '10 막힘: %', sqlerrm; end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
select '11 빼기' t, mall_builder_resale_remove((select id from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000c1'));
select '12 남은 거울' t, count(*) from mall_builder_products where source_product_id is not null;
