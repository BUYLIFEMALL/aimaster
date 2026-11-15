-- 0091 시나리오 — scenario-0090-supplier-sales-breakdown.sql 바로 뒤에 같은 psql 세션으로 이어서 실행(:'pid' = 티셔츠).
-- 시험몰은 수수료율 몰(본사 3%), 티셔츠는 판매가 10,000 · 리셀러 10% → 공급가 비율 87%.
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;

-- V1 추가 판매가로 저장: 빨강 +1,000 / 파랑 0 → 판매 추가금 1,000·0, 추가 공급가 870·0(1,000 × 87% 버림)
select 'V1 저장' t, mall_builder_supplier_options_save(:'pid',
  '[{"name":"색상","values":["빨강","파랑"]}]'::jsonb,
  '[{"key":"빨강","values":["빨강"],"extra_sale":1000,"stock":0,"sku":"","is_active":true},
    {"key":"파랑","values":["파랑"],"extra_sale":0,"stock":0,"sku":"","is_active":true}]'::jsonb) r;
reset role;
select 'V1 값' t, pv.key, pv.extra_price, vs.extra_supply from mall_builder_product_variants pv join mall_builder_variant_supply vs on vs.variant_id = pv.id where pv.product_id = :'pid' order by pv.sort;
-- V2 같은 값으로 다시 저장 → kept(다시 승인 대기로 가지 않음)
update mall_builder_products set approval = 'approved' where id = :'pid';
set role authenticated;
select 'V2 그대로' t, mall_builder_supplier_options_save(:'pid',
  '[{"name":"색상","values":["빨강","파랑"]}]'::jsonb,
  '[{"key":"빨강","values":["빨강"],"extra_sale":1000,"stock":3,"sku":"R","is_active":true},
    {"key":"파랑","values":["파랑"],"extra_sale":0,"stock":0,"sku":"","is_active":true}]'::jsonb) r;
-- V3 빨강을 1,999로 → 바뀜(kept 아님), 추가 공급가 1,739(1,999 × 87% = 1,739.13 버림)
select 'V3 바꿈' t, mall_builder_supplier_options_save(:'pid',
  '[{"name":"색상","values":["빨강","파랑"]}]'::jsonb,
  '[{"key":"빨강","values":["빨강"],"extra_sale":1999,"stock":3,"sku":"R","is_active":true},
    {"key":"파랑","values":["파랑"],"extra_sale":0,"stock":0,"sku":"","is_active":true}]'::jsonb) r;
reset role;
select 'V3 값' t, pv.key, pv.extra_price, vs.extra_supply from mall_builder_product_variants pv join mall_builder_variant_supply vs on vs.variant_id = pv.id where pv.product_id = :'pid' order by pv.sort;
-- V4 음수 추가 판매가는 막힘(문구에 「추가 판매가」)
set role authenticated;
do $$ begin
  perform mall_builder_supplier_options_save((select id from mall_builder_products where name = '티셔츠'),
    '[{"name":"색상","values":["빨강"]}]'::jsonb, '[{"key":"빨강","values":["빨강"],"extra_sale":-5,"stock":0}]'::jsonb);
  raise notice 'V4 — 통과됨(문제)';
exception when others then raise notice 'V4 막힘: %', sqlerrm; end $$;
-- V5 옛 화면(extra_supply로 보냄)도 그대로 동작: 추가 공급가 500 → 판매 추가금 575(500 × 10,000/8,700 반올림), 공급가 다시 계산 500
select 'V5 옛 요청' t, mall_builder_supplier_options_save(:'pid',
  '[{"name":"색상","values":["빨강"]}]'::jsonb, '[{"key":"빨강","values":["빨강"],"extra_supply":500,"stock":0}]'::jsonb) r;
reset role;
select 'V5 값' t, pv.key, pv.extra_price, vs.extra_supply from mall_builder_product_variants pv join mall_builder_variant_supply vs on vs.variant_id = pv.id where pv.product_id = :'pid';
-- V6 공급가 직접 입력 몰로 바꾸면 extra_sale은 쓰지 않음(extra_supply 없으니 0)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select mall_builder_supply_settings_save('00000000-0000-0000-0000-00000000005a', 'manual', 3);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1', false);
select 'V6 직접 입력 몰' t, mall_builder_supplier_options_save(:'pid',
  '[{"name":"색상","values":["빨강"]}]'::jsonb, '[{"key":"빨강","values":["빨강"],"extra_sale":777,"stock":0}]'::jsonb) r;
reset role;
select 'V6 값' t, pv.key, pv.extra_price, vs.extra_supply from mall_builder_product_variants pv join mall_builder_variant_supply vs on vs.variant_id = pv.id where pv.product_id = :'pid';
