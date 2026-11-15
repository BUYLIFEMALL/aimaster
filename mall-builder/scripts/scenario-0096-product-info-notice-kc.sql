-- 0096 상품정보제공고시·KC 시나리오(로컬 Docker 전용). 운영 번들 → 0061 → 0062 시나리오 뒤에 같은 시험 DB에서 psql -f. 결과 줄 앞에 N1~N6.
\set ON_ERROR_STOP 1
-- N1 본사 상품에 고시·KC를 넣기 전에 분양자가 담음 → 빈 값
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
select mall_builder_resale_add((select id from mall_builder_stores where slug='my-shop'), array['00000000-0000-0000-0000-0000000000c1']::uuid[], 0) as added;
reset role;
select 'N1' t, m.info_notice, m.kc_certs from mall_builder_products m where m.source_product_id='00000000-0000-0000-0000-0000000000c1';
-- N2 본사가 고시·KC를 넣으면 거울 상품도 따라감
update mall_builder_products set info_notice = '{"type":"의류","items":[{"label":"색상","value":"분홍"}]}', kc_certs = '[{"kind":"안전확인","no":"AB-1234"}]'
 where id='00000000-0000-0000-0000-0000000000c1';
select 'N2' t, m.info_notice ->> 'type' type, m.info_notice #>> '{items,0,value}' color, m.kc_certs #>> '{0,no}' kc from mall_builder_products m where m.source_product_id='00000000-0000-0000-0000-0000000000c1';
-- N3 다른 칸만 바뀌면 고시 트리거는 거울을 건드리지 않음(기존 동기화만)
update mall_builder_products set name = name || ' ' where id='00000000-0000-0000-0000-0000000000c1';
select 'N3' t, m.info_notice ->> 'type' type from mall_builder_products m where m.source_product_id='00000000-0000-0000-0000-0000000000c1';
-- N4 새로 담는 거울 상품은 담는 순간 본사 값(분양몰 둘째 상품으로 시험: 본사 상품 하나 더 만들어 값 넣고 담기)
insert into mall_builder_products (id, store_id, name, base_price, status, info_notice, kc_certs)
values ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-00000000005a', '고시 있는 상품', 5000, 'on_sale',
        '{"type":"기타 재화","items":[{"label":"품명 및 모델명","value":"M-1"}]}', '[{"kind":"해당 없음","no":""}]');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
select mall_builder_resale_add((select id from mall_builder_stores where slug='my-shop'), array['00000000-0000-0000-0000-0000000000c9']::uuid[], 0) as added2;
reset role;
select 'N4' t, m.info_notice ->> 'type' type, m.kc_certs #>> '{0,kind}' kc from mall_builder_products m where m.source_product_id='00000000-0000-0000-0000-0000000000c9';
-- N5 검사 조건: 배열 아닌 KC·31개 항목·객체 아닌 고시는 막힘
do $$ begin update mall_builder_products set kc_certs = '{"a":1}' where id='00000000-0000-0000-0000-0000000000c9'; raise notice 'N5a 통과됨(문제)'; exception when others then raise notice 'N5a 막힘: %', left(sqlerrm, 60); end $$;
do $$ begin update mall_builder_products set info_notice = jsonb_build_object('type','의류','items',(select jsonb_agg(jsonb_build_object('label','x','value','y')) from generate_series(1,31))) where id='00000000-0000-0000-0000-0000000000c9'; raise notice 'N5b 통과됨(문제)'; exception when others then raise notice 'N5b 막힘: %', left(sqlerrm, 60); end $$;
do $$ begin update mall_builder_products set info_notice = '[]' where id='00000000-0000-0000-0000-0000000000c9'; raise notice 'N5c 통과됨(문제)'; exception when others then raise notice 'N5c 막힘: %', left(sqlerrm, 60); end $$;
-- N6 기존 상품(값 없음)은 기본값
select 'N6' t, count(*) filter (where info_notice = '{}'::jsonb) empty_notice, count(*) filter (where kc_certs = '[]'::jsonb) empty_kc, count(*) total from mall_builder_products
 where id not in ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c9') and source_product_id is null;
