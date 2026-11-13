-- 0064 상세 그림 시나리오(로컬 Docker 전용, 2026-11-13). 0061·0062 시나리오 뒤에 이어서(같은 시험 DB) psql -f 로 실행
\set ON_ERROR_STOP 1
reset role;
-- 본사 상품 하나에 상세 그림 2장
insert into mall_builder_products (id, store_id, name, base_price, status, stock_mode, detail_images) values
 ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000005a','컵홀더',13000,'on_sale','none',
  '[{"url":"https://x/00000000-0000-0000-0000-00000000005a/products/d1.jpg","path":"00000000-0000-0000-0000-00000000005a/products/d1.jpg"},{"url":"https://x/00000000-0000-0000-0000-00000000005a/products/d2.jpg","path":"00000000-0000-0000-0000-00000000005a/products/d2.jpg"}]');
select '1 기본값(다른 상품은 빈 배열)' t, count(*) filter (where detail_images = '[]'::jsonb) empty_cnt, count(*) total from mall_builder_products;

-- 41장은 막힘
do $$ begin
  update mall_builder_products set detail_images = (select jsonb_agg(jsonb_build_object('url','u','path','p')) from generate_series(1,41)) where id='00000000-0000-0000-0000-0000000000d1';
  raise notice '2 41장 저장 — 통과됨(문제)';
exception when others then raise notice '2 막힘: %', sqlerrm; end $$;

-- 분양몰에 담으면 상세 그림도 복사
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
select '3 담기' t, mall_builder_resale_add((select id from mall_builder_stores where slug='my-shop'), array['00000000-0000-0000-0000-0000000000d1']::uuid[], 10);
select '4 거울 상세 그림' t, jsonb_array_length(detail_images) n from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000d1';

-- 본사가 상세 그림을 바꾸면 거울도 따라감
reset role;
update mall_builder_products set detail_images = detail_images || '[{"url":"https://x/00000000-0000-0000-0000-00000000005a/products/d3.jpg","path":"00000000-0000-0000-0000-00000000005a/products/d3.jpg"}]'::jsonb
 where id='00000000-0000-0000-0000-0000000000d1';
select '5 동기화' t, jsonb_array_length(detail_images) n, detail_images -> 2 ->> 'path' third from mall_builder_products where source_product_id='00000000-0000-0000-0000-0000000000d1';

-- 손님 상품 읽기 함수에 상세 그림이 들어감
select '6 손님 읽기' t, jsonb_array_length(x -> 'detail_images') n from mall_builder_shop_products('00000000-0000-0000-0000-00000000005a', array['00000000-0000-0000-0000-0000000000d1']::uuid[]) x;

-- 상세 그림에만 쓰인 사진은 「쓰는 중」, 아무 데도 안 쓰인 사진은 아님
insert into storage.buckets (id, name, public) values ('mall-builder-public','mall-builder-public',true) on conflict do nothing;
insert into storage.objects (bucket_id, name, metadata, created_at) values
 ('mall-builder-public','00000000-0000-0000-0000-00000000005a/products/d3.jpg','{"size":100}', now() - interval '2 days'),
 ('mall-builder-public','00000000-0000-0000-0000-00000000005a/products/zz.jpg','{"size":100}', now() - interval '2 days');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '7 사진 쓰임' t, name, in_use, deletable from mall_builder_store_files('00000000-0000-0000-0000-00000000005a') order by name;
