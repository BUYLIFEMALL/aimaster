-- 0102 교환 시나리오(로컬 Docker 전용). 0001~0102 번들 → 0061 시나리오(본사 hq-mall 5a, 대표 a1) 뒤 같은 시험 DB에서 psql -f. 결과 줄 앞에 X1~X11.
\set ON_ERROR_STOP 1
-- 사람: 유저 u1(주문자)·u2(남), 직원 s1(상품 권한만)·s2(주문 권한)
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000f1','u1@x.test'),('00000000-0000-0000-0000-0000000000f2','u2@x.test'),
 ('00000000-0000-0000-0000-0000000000f7','s1@x.test'),('00000000-0000-0000-0000-0000000000f8','s2@x.test');
insert into public.profiles (id, email) values
 ('00000000-0000-0000-0000-0000000000f1','u1@x.test'),('00000000-0000-0000-0000-0000000000f2','u2@x.test'),
 ('00000000-0000-0000-0000-0000000000f7','s1@x.test'),('00000000-0000-0000-0000-0000000000f8','s2@x.test');
insert into mall_builder_store_staff (store_id, user_id, role, perms) values
 ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f7','staff','{"products":true}'),
 ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f8','staff','{"orders":true}');

-- 배송비 정책(교환비 3,000원), 옵션 상품(재고 관리: S 5·M 2·L 0), 옵션 없는 상품(재고 관리 안 함)
insert into mall_builder_shipping_policies (id, store_id, name, type, exchange_fee) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000005a','교환비 정책','free',3000);
insert into mall_builder_products (id, store_id, name, base_price, stock_mode, stock) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','티셔츠',10000,'product',0),
 ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-00000000005a','머그컵',8000,'none',0);
insert into mall_builder_product_variants (id, product_id, store_id, key, "values", stock) values
 ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','S','["S"]',5),
 ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','M','["M"]',2),
 ('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','L','["L"]',0);

-- 주문: e1 배송 완료 2일 전(티셔츠 S 3개·머그컵 1개), e2 배송 완료 10일 전(티셔츠 S 1개)
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, status, total, is_card, is_credit) values
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-00000000005a',91,'EX-1','00000000-0000-0000-0000-0000000000f1','{"name":"받는분1","phone":"010-1111-0001","zip":"1"}','유저1','delivered',38000,false,false),
 ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-00000000005a',92,'EX-2','00000000-0000-0000-0000-0000000000f1','{"name":"받는분1","phone":"010-1111-0001","zip":"1"}','유저1','delivered',10000,false,false);
insert into mall_builder_order_items (id, order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total, shipping_policy_id) values
 ('00000000-0000-0000-0000-0000000001a1','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000d1','티셔츠','S',10000,3,30000,'00000000-0000-0000-0000-0000000000b1'),
 ('00000000-0000-0000-0000-0000000001a2','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c2',null,'머그컵','',8000,1,8000,null),
 ('00000000-0000-0000-0000-0000000001a3','00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000d1','티셔츠','S',10000,1,10000,'00000000-0000-0000-0000-0000000000b1');
insert into mall_builder_order_events (order_id, from_status, to_status, actor_role, created_at) values
 ('00000000-0000-0000-0000-0000000000e1','shipping','delivered','staff', now() - interval '2 days'),
 ('00000000-0000-0000-0000-0000000000e2','shipping','delivered','staff', now() - interval '10 days');

-- X1 유저 접수(사이즈, S→M 1개) → 교환비 = 정책 3,000원·결제 대기
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', false);
create temp table x1 as select public.mall_builder_request_exchange('00000000-0000-0000-0000-0000000001a1', 1, '00000000-0000-0000-0000-0000000000d2', 'size', '작아요') id;
select 'X1' t, x.requested_by, x.step, x.fee, x.fee_status, x.from_option, x.to_option from mall_builder_exchanges x where x.id = (select id from x1);
-- X2 같은 줄 진행 중 → 중복 접수 막힘 / 수량 초과 막힘(머그컵 2개)
do $$ begin perform public.mall_builder_request_exchange('00000000-0000-0000-0000-0000000001a1', 1, '00000000-0000-0000-0000-0000000000d2', 'size'); raise notice 'X2a 통과됨(문제)';
exception when others then raise notice 'X2a 막힘 %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_request_exchange('00000000-0000-0000-0000-0000000001a2', 2, null, 'defect'); raise notice 'X2b 통과됨(문제)';
exception when others then raise notice 'X2b 막힘 %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_request_exchange('00000000-0000-0000-0000-0000000001a2', 1, '00000000-0000-0000-0000-0000000000d2', 'defect'); raise notice 'X2c 통과됨(문제)';
exception when others then raise notice 'X2c 막힘 %', sqlerrm; end $$;
-- X3 10일 지난 주문: 유저 막힘 / 주문 권한 직원 대리 접수 됨(불량 → 교환비 0)
do $$ begin perform public.mall_builder_request_exchange('00000000-0000-0000-0000-0000000001a3', 1, '00000000-0000-0000-0000-0000000000d2', 'size'); raise notice 'X3a 통과됨(문제)';
exception when others then raise notice 'X3a 막힘 %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f8', false);
create temp table x3 as select public.mall_builder_request_exchange('00000000-0000-0000-0000-0000000001a3', 1, '00000000-0000-0000-0000-0000000000d3', 'defect', '대리') id;
select 'X3' t, x.requested_by, x.fee, x.fee_status from mall_builder_exchanges x where x.id = (select id from x3);
-- X4 상품 권한만 있는 직원은 단계를 못 바꿈
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f7', false);
do $$ begin perform public.mall_builder_exchange_step((select id from x1), 'collecting', 'CJ', '111'); raise notice 'X4 통과됨(문제)';
exception when others then raise notice 'X4 막힘 %', sqlerrm; end $$;
-- X5 대표: 회수 전 재발송 막힘 → 회수 중(송장 필수) → 회수 완료 = S 재고 5→6
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
do $$ begin perform public.mall_builder_exchange_step((select id from x1), 'reshipped', 'CJ', '222'); raise notice 'X5a 통과됨(문제)';
exception when others then raise notice 'X5a 막힘 %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_exchange_step((select id from x1), 'collecting', '', ''); raise notice 'X5b 통과됨(문제)';
exception when others then raise notice 'X5b 막힘 %', sqlerrm; end $$;
select public.mall_builder_exchange_step((select id from x1), 'collecting', 'CJ대한통운', '111');
select public.mall_builder_exchange_step((select id from x1), 'collected');
select 'X5' t, (select stock from mall_builder_product_variants where id = '00000000-0000-0000-0000-0000000000d1') s_stock,
  (select restocked from mall_builder_exchanges where id = (select id from x1)) restocked;
-- X6 교환비 대기 중 재발송 막힘 → 입금 확인 → 재발송 = M 재고 2→1 → 완료 / 결제 뒤 금액 변경 막힘
do $$ begin perform public.mall_builder_exchange_step((select id from x1), 'reshipped', 'CJ', '222'); raise notice 'X6a 통과됨(문제)';
exception when others then raise notice 'X6a 막힘 %', sqlerrm; end $$;
select public.mall_builder_exchange_fee_paid((select id from x1));
do $$ begin perform public.mall_builder_exchange_fee((select id from x1), 0); raise notice 'X6b 통과됨(문제)';
exception when others then raise notice 'X6b 막힘 %', sqlerrm; end $$;
select public.mall_builder_exchange_step((select id from x1), 'reshipped', 'CJ대한통운', '222');
select public.mall_builder_exchange_step((select id from x1), 'done');
select 'X6' t, x.step, x.fee_status, (select stock from mall_builder_product_variants where id = '00000000-0000-0000-0000-0000000000d2') m_stock, x.reship_tracking
  from mall_builder_exchanges x where x.id = (select id from x1);
-- X7 L(재고 0)로 바꾸는 대리 교환: 회수 완료 뒤 재발송 = 재고 부족 막힘, 단계 그대로
select public.mall_builder_exchange_step((select id from x3), 'collected');
do $$ begin perform public.mall_builder_exchange_step((select id from x3), 'reshipped', 'CJ', '333'); raise notice 'X7a 통과됨(문제)';
exception when others then raise notice 'X7a 막힘 %', sqlerrm; end $$;
select 'X7' t, x.step, x.reship_deducted, (select stock from mall_builder_product_variants where id = '00000000-0000-0000-0000-0000000000d3') l_stock
  from mall_builder_exchanges x where x.id = (select id from x3);
-- X8 거절: 회수 완료 뒤 막힘 / 사유 없으면 막힘 / 머그컵 새 접수 → 거절 됨 → 같은 줄 다시 접수 가능
do $$ begin perform public.mall_builder_exchange_step((select id from x3), 'rejected', '', '', '안 됨'); raise notice 'X8a 통과됨(문제)';
exception when others then raise notice 'X8a 막힘 %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', false);
create temp table x8 as select public.mall_builder_request_exchange('00000000-0000-0000-0000-0000000001a2', 1, null, 'wrong_item') id;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
do $$ begin perform public.mall_builder_exchange_step((select id from x8), 'rejected'); raise notice 'X8b 통과됨(문제)';
exception when others then raise notice 'X8b 막힘 %', sqlerrm; end $$;
select public.mall_builder_exchange_step((select id from x8), 'rejected', '', '', '사진 확인 결과 정상');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', false);
create temp table x8c as select public.mall_builder_request_exchange('00000000-0000-0000-0000-0000000001a2', 1, null, 'defect') id;
select 'X8' t, (select step from mall_builder_exchanges where id = (select id from x8)) first_step,
  (select step from mall_builder_exchanges where id = (select id from x8c)) second_step;
-- X9 화면 노출(RLS): u1 본인 교환 보임, u2 0건, 주문 권한 직원 s2 몰 전체, 상품 권한만 s1 0건
reset role;
grant select on public.mall_builder_exchanges to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', false);
create temp table x9 (who text, n bigint);
insert into x9 select 'u1', count(*) from public.mall_builder_exchanges;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f2', false);
insert into x9 select 'u2', count(*) from public.mall_builder_exchanges;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f8', false);
insert into x9 select 's2', count(*) from public.mall_builder_exchanges;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f7', false);
insert into x9 select 's1', count(*) from public.mall_builder_exchanges;
-- X10 로그인 회원 직접 고치기 막힘
do $$ begin update public.mall_builder_exchanges set fee_status = 'paid'; raise notice 'X10a 통과됨(문제)';
exception when others then raise notice 'X10a 막힘 %', sqlerrm; end $$;
reset role;
select 'X9' t, string_agg(who || '=' || n, ',' order by who) from x9;
select 'X10' t, count(*) anon_exec from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('mall_builder_request_exchange','mall_builder_exchange_step','mall_builder_exchange_fee','mall_builder_exchange_fee_paid')
   and has_function_privilege('anon', p.oid, 'execute');
-- X11 재고 관리 안 하는 머그컵: 회수 완료·재발송해도 상품 재고 0 그대로 / 주문 이력에 교환 기록 남음 / 주문 상태 delivered 그대로
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select public.mall_builder_exchange_step((select id from x8c), 'collected');
select public.mall_builder_exchange_step((select id from x8c), 'reshipped', '우체국', '444');
select 'X11' t, (select stock from mall_builder_products where id = '00000000-0000-0000-0000-0000000000c2') mug_stock,
  (select count(*) from mall_builder_order_events where order_id = '00000000-0000-0000-0000-0000000000e1' and note like '교환%') ex_events,
  (select status from mall_builder_orders where id = '00000000-0000-0000-0000-0000000000e1') order_status;
-- X12 조건 없는 delete 없음(Supabase safeupdate)
select 'X12' t, count(*) no_where_delete from (
  select (regexp_matches(p.prosrc, 'delete\s+from\s+[^;]+;', 'gi'))[1] s
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.proname like '%exchange%'
) x where s !~* '\mwhere\M';
