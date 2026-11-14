-- 0078 리셀러 판매 내역·판매 수·픽·짧은 링크 시나리오(로컬 Docker 전용, 단독). 0077 시나리오 준비 재사용
-- 몰 scn(대표 a1, 수수료율 방식 본사 3%), 공급사 b1, 리셀러 R1(유저 c1·f1, 추가율 2%), 구매자 c4(f4), 다른 사람 e9
\set ON_ERROR_STOP 1
insert into auth.users (id, email) select ('00000000-0000-0000-0000-0000000000' || x)::uuid, x || '@x.test' from unnest(array['a1','b1','f1','f2','f4','e9']) x;
insert into public.profiles (id, email) select ('00000000-0000-0000-0000-0000000000' || x)::uuid, x || '@x.test' from unnest(array['a1','b1','f1','f2','f4','e9']) x;
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

-- 0078 준비: 다른 리셀러 R2(유저 c2·f2), 본사 컵에 리셀러율 5%
insert into mall_builder_store_customers (id, store_id, user_id, name, phone) values ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f2','리셀러2','010-2222-3333');
insert into mall_builder_resellers (id, store_id, customer_id, code, rate, active) values ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000c2','RSLR02',0,true);
update mall_builder_products set reward_rate = 5 where id = '00000000-0000-0000-0000-0000000000d9';
-- 주문: T-1 링크(R1) 결제 완료(컵 2개 + 티셔츠 1개), T-2 링크(R1) 입금 대기, T-3 링크 없음 결제 완료(컵 3개), T-4 R2 결제 완료(컵 1개)
select pg_temp.ord(1, 'scn=RSLR01', 0, jsonb_build_array(jsonb_build_object('pid', '00000000-0000-0000-0000-0000000000d9', 'name', '본사 컵', 'qty', 2, 'line', 10000), jsonb_build_object('pid', :'pid', 'name', '티셔츠', 'qty', 1, 'line', 10000))) as o1 \gset
update mall_builder_orders set status = 'paid' where id = :'o1';
select pg_temp.ord(2, 'scn=RSLR01', 0, jsonb_build_array(jsonb_build_object('pid', '00000000-0000-0000-0000-0000000000d9', 'name', '본사 컵', 'qty', 1, 'line', 5000))) as o2 \gset
select pg_temp.ord(3, null, 0, jsonb_build_array(jsonb_build_object('pid', '00000000-0000-0000-0000-0000000000d9', 'name', '본사 컵', 'qty', 3, 'line', 15000))) as o3 \gset
update mall_builder_orders set status = 'paid' where id = :'o3';
select pg_temp.ord(4, 'scn=RSLR02', 0, jsonb_build_array(jsonb_build_object('pid', '00000000-0000-0000-0000-0000000000d9', 'name', '본사 컵', 'qty', 1, 'line', 5000))) as o4 \gset
update mall_builder_orders set status = 'paid' where id = :'o4';
select set_config('request.headers', '{}', false);

-- A 판매 내역(R1 본인): T-1(품목 2, 20,000, 리워드 지급 예정), T-2(입금 대기, 리워드 0). T-3·T-4 안 보임
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', false);
set role authenticated;
select 'A 판매' t, order_no, status, ref_source, item_count, first_item, items_total, reward, reward_pending from mall_builder_reseller_sales('00000000-0000-0000-0000-00000000005a') order by order_no;
-- B 판매 수(최근 30일, 결제 이후만): 컵 2+3+1=6(T-2 입금 대기 제외), 티셔츠 1
select 'B 판매 수' t, p.name, s.sold from mall_builder_product_sold('00000000-0000-0000-0000-00000000005a') s join mall_builder_products p on p.id = s.product_id order by p.name;
-- C 픽: 컵 켬 → 끔 → 켬, 티셔츠 켬 → 2개
select 'C1' t, mall_builder_reseller_pick_toggle('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000d9') v;
select 'C2' t, mall_builder_reseller_pick_toggle('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000d9') v;
select 'C3' t, mall_builder_reseller_pick_toggle('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000d9') v;
select 'C4' t, mall_builder_reseller_pick_toggle('00000000-0000-0000-0000-00000000005a', :'pid') v;
select 'C5 내 픽 수' t, count(*) from mall_builder_reseller_picks;
do $$ begin perform mall_builder_reseller_pick_toggle('00000000-0000-0000-0000-00000000005a', gen_random_uuid()); raise notice 'C6 없는 상품 — 통과됨(문제)'; exception when others then raise notice 'C6 막힘: %', sqlerrm; end $$;
-- D 짧은 링크: 컵 키, 다시 만들어도 같은 키, 몰 첫 화면 키는 다름
select mall_builder_reseller_link_make('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000d9') as k1 \gset
select mall_builder_reseller_link_make('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000d9') as k1b \gset
select mall_builder_reseller_link_make('00000000-0000-0000-0000-00000000005a', null) as kh \gset
select 'D 키' t, length(:'k1') len, :'k1' = :'k1b' same, :'k1' <> :'kh' diff_home;
reset role;
-- E 다른 리셀러 R2: 내 판매에 T-4만, R1 픽·링크 안 보임
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f2', false);
set role authenticated;
select 'E 판매' t, order_no, reward from mall_builder_reseller_sales('00000000-0000-0000-0000-00000000005a');
select 'E 남의 픽·링크' t, (select count(*) from mall_builder_reseller_picks) picks, (select count(*) from mall_builder_reseller_links) links;
reset role;
-- F 유저(f4·비리셀러)은 판매 내역·판매 수·링크 만들기 막힘
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f4', false);
set role authenticated;
do $$ begin perform * from mall_builder_reseller_sales('00000000-0000-0000-0000-00000000005a'); raise notice 'F1 — 통과됨(문제)'; exception when others then raise notice 'F1 막힘: %', sqlerrm; end $$;
do $$ begin perform * from mall_builder_product_sold('00000000-0000-0000-0000-00000000005a'); raise notice 'F2 — 통과됨(문제)'; exception when others then raise notice 'F2 막힘: %', sqlerrm; end $$;
do $$ begin perform mall_builder_reseller_link_make('00000000-0000-0000-0000-00000000005a', null); raise notice 'F3 — 통과됨(문제)'; exception when others then raise notice 'F3 막힘: %', sqlerrm; end $$;
reset role;
-- G 운영사(a1)는 판매 수 봄
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select 'G 운영사 판매 수 줄' t, count(*) from mall_builder_product_sold('00000000-0000-0000-0000-00000000005a');
reset role;
-- H 열기(비로그인): 맞는 몰 → 컵·RSLR01, 누른 수 1 / 다른 몰 이름 → 없음 / 이상한 키 → 없음 / 품절 → 상품 그대로 / 숨김 → 상품 null / 리셀러 정지 → 없음
select set_config('request.jwt.claim.sub','', false);
set role anon;
select 'H1 열기' t, product_id = '00000000-0000-0000-0000-0000000000d9' cup, code from mall_builder_reseller_link_open('scn', :'k1');
select 'H2 다른 몰' t, count(*) from mall_builder_reseller_link_open('other', :'k1');
select 'H3 이상한 키' t, count(*) from mall_builder_reseller_link_open('scn', 'x'' or 1=1');
reset role;
select 'H4 누른 수' t, clicks from mall_builder_reseller_links where key = :'k1';
update mall_builder_products set status = 'sold_out' where id = '00000000-0000-0000-0000-0000000000d9';
set role anon;
select 'H5 품절' t, product_id is not null product, code from mall_builder_reseller_link_open('scn', :'k1');
reset role;
update mall_builder_products set status = 'hidden' where id = '00000000-0000-0000-0000-0000000000d9';
set role anon;
select 'H6 숨김' t, product_id is null home, code from mall_builder_reseller_link_open('scn', :'k1');
reset role;
update mall_builder_resellers set active = false where id = '00000000-0000-0000-0000-0000000000e1';
set role anon;
select 'H7 리셀러 정지' t, count(*) from mall_builder_reseller_link_open('scn', :'k1');
reset role;
