-- 0068 공급가 수수료율 자동 시나리오(로컬 Docker 전용). 흉내 틀 + 묶음 적용 뒤 psql -f
-- 대표 a1, 공급사 계정 b1(가나상사 c1), 다른 사람 e9. 몰 rate(5a, 수수료율 방식) / man(5b, 옛 방식)
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test'),('00000000-0000-0000-0000-0000000000b1','sup@x.test'),('00000000-0000-0000-0000-0000000000e9','other@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test'),('00000000-0000-0000-0000-0000000000b1','sup@x.test'),('00000000-0000-0000-0000-0000000000e9','other@x.test');
insert into mall_builder_stores (id, name, owner_id, slug, status) values
  ('00000000-0000-0000-0000-00000000005a','수수료율몰','00000000-0000-0000-0000-0000000000a1','rate','active'),
  ('00000000-0000-0000-0000-00000000005b','옛방식몰','00000000-0000-0000-0000-0000000000a1','man','active');
insert into mall_builder_store_staff (store_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner'),('00000000-0000-0000-0000-00000000005b','00000000-0000-0000-0000-0000000000a1','owner');
insert into mall_builder_suppliers (id, store_id, name, email, user_id, status) values
  ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','가나상사','sup@x.test','00000000-0000-0000-0000-0000000000b1','active'),
  ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-00000000005b','가나상사','sup@x.test','00000000-0000-0000-0000-0000000000b1','active');
grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;

-- 1 대표가 rate 몰을 수수료율 방식·기본 3%로
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select mall_builder_supply_settings_save('00000000-0000-0000-0000-00000000005a', 'rate', 3);
-- 2 공급사가 희망 판매가 10,000원으로 올림(공급가 칸은 9999를 보내도 무시돼야 함)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1', false);
select mall_builder_supplier_product_save('00000000-0000-0000-0000-00000000005a', null, '{"name":"티셔츠","supply_price":"9999","base_price":"10000","stock_mode":"none","images":[]}'::jsonb) as pid \gset
select '2 처음 공급가(리셀러 0%)' t, supply_price, hq_rate, reseller_rate from mall_builder_product_supply where product_id=:'pid';
-- 3 공급사가 리셀러율 10% → 10,000 × 0.87 = 8,700
select '3 리셀러 10%' t, mall_builder_product_reseller_rate_set(:'pid', 10) supply;
-- 4 다른 사람·공급사는 본사율을 못 바꿈, 합계 90% 초과 막힘
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e9', false);
do $$ begin perform mall_builder_product_reseller_rate_set((select product_id from mall_builder_product_supply limit 1), 20); raise notice '4a 다른 사람 리셀러율 — 통과됨(문제)'; exception when others then raise notice '4a 막힘: %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1', false);
do $$ begin perform mall_builder_supplier_hq_rate_set('00000000-0000-0000-0000-0000000000c1', 0); raise notice '4b 공급사 본사율 — 통과됨(문제)'; exception when others then raise notice '4b 막힘: %', sqlerrm; end $$;
do $$ begin perform mall_builder_product_reseller_rate_set((select product_id from mall_builder_product_supply limit 1), 60); raise notice '4c 60%% — 통과됨(문제)'; exception when others then raise notice '4c 막힘: %', sqlerrm; end $$;
-- 5 대표가 이 공급사 본사율 5% → 10,000 × 0.85 = 8,500
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select mall_builder_supplier_hq_rate_set('00000000-0000-0000-0000-0000000000c1', 5);
select '5 공급사별 5%' t, supply_price, hq_rate, reseller_rate from mall_builder_product_supply where product_id=:'pid';
-- 6 승인하며 판매가 12,000원 → 12,000 × 0.85 = 10,200
select mall_builder_product_review(:'pid','approve','',12000,true);
select '6 승인 판매가 12000' t, supply_price from mall_builder_product_supply where product_id=:'pid';
-- 7 공급사별 값을 비우면 몰 기본 3%로 → 12,000 × 0.87 = 10,440
select mall_builder_supplier_hq_rate_set('00000000-0000-0000-0000-0000000000c1', null);
select '7 기본값으로' t, supply_price, hq_rate from mall_builder_product_supply where product_id=:'pid';
-- 8 옵션: 추가 판매금 1,000원 → 추가 공급가 870
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1', false);
select mall_builder_supplier_options_save(:'pid', '[{"name":"색상","values":["빨강","파랑"]}]', '[{"key":"빨강","values":["빨강"],"extra_supply":0,"stock":5},{"key":"파랑","values":["파랑"],"extra_supply":500,"stock":5}]');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select mall_builder_variant_prices_set(:'pid','{"파랑":1000}');
select '8 옵션 추가 공급가' t, v.key, v.extra_price, s.extra_supply from mall_builder_product_variants v join mall_builder_variant_supply s on s.variant_id=v.id where v.product_id=:'pid' order by v.sort;
-- 9 옛 방식 몰: 공급사가 보낸 공급가 그대로
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1', false);
select mall_builder_supplier_product_save('00000000-0000-0000-0000-00000000005b', null, '{"name":"모자","supply_price":"7000","base_price":"10000","stock_mode":"none","images":[]}'::jsonb) as pid2 \gset
select mall_builder_product_reseller_rate_set(:'pid2', 10);
select '9 옛 방식' t, supply_price, hq_rate, reseller_rate from mall_builder_product_supply where product_id=:'pid2';
