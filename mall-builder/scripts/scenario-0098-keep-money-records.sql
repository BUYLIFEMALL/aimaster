-- 0098 몰 탈퇴 때 돈 기록 보존·탈퇴 막기 시나리오(로컬 Docker 전용). 운영 번들 → 0061 시나리오(본사 hq-mall) 뒤에 같은 시험 DB에서 psql -f. 결과 줄 앞에 K1~K7.
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c7','leaver@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000c7','leaver@x.test');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone)
values ('00000000-0000-0000-0000-00000000c7c7','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000c7','탈퇴유저','010-7777-0000');
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, status, total)
values ('00000000-0000-0000-0000-0000000000d7','00000000-0000-0000-0000-00000000005a',71,'K-1','00000000-0000-0000-0000-0000000000c7','00000000-0000-0000-0000-00000000c7c7','{"zip":"1"}','탈퇴유저','paid',5000);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c7', false);
-- K1 진행 중 주문(결제 완료) → 막힘
do $$ begin delete from public.mall_builder_store_customers where id='00000000-0000-0000-0000-00000000c7c7'; raise notice 'K1 통과됨(문제)'; exception when others then raise notice 'K1 막힘: %', sqlerrm; end $$;
-- K2 주문 끝(배송 완료) + 외상 잔액 5,000 → 막힘
reset role;
update mall_builder_orders set status='delivered' where id='00000000-0000-0000-0000-0000000000d7';
insert into mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note)
values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-00000000c7c7','00000000-0000-0000-0000-0000000000d7','charge',5000,5000,'외상');
do $$ begin delete from public.mall_builder_store_customers where id='00000000-0000-0000-0000-00000000c7c7'; raise notice 'K2 통과됨(문제)'; exception when others then raise notice 'K2 막힘: %', sqlerrm; end $$;
-- K3 외상 갚음(잔액 0) + 리셀러로 받을 수수료 3,000 → 막힘
insert into mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note)
values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-00000000c7c7',null,'payment',-5000,0,'입금');
insert into mall_builder_resellers (id, store_id, customer_id, code, rate) values ('00000000-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-00000000c7c7','LEAVE7',5);
insert into mall_builder_reseller_ledger (store_id, reseller_id, order_id, kind, amount, balance_after, note)
values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-0000000000d7','earn',3000,3000,'수수료');
do $$ begin delete from public.mall_builder_store_customers where id='00000000-0000-0000-0000-00000000c7c7'; raise notice 'K3 통과됨(문제)'; exception when others then raise notice 'K3 막힘: %', sqlerrm; end $$;
-- K4 지급 신청(잔액 0, 지급 대기) → 막힘
insert into mall_builder_reseller_payouts (id, store_id, reseller_id, amount, bank_name, bank_account, bank_holder, status)
values ('00000000-0000-0000-0000-0000000000f7','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000e7',3000,'국민','1','탈퇴유저','requested');
insert into mall_builder_reseller_ledger (store_id, reseller_id, payout_id, kind, amount, balance_after, note)
values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-0000000000f7','payout',-3000,0,'지급 신청');
do $$ begin delete from public.mall_builder_store_customers where id='00000000-0000-0000-0000-00000000c7c7'; raise notice 'K4 통과됨(문제)'; exception when others then raise notice 'K4 막힘: %', sqlerrm; end $$;
-- K5 지급 완료 → 탈퇴 됨
update mall_builder_reseller_payouts set status='paid' where id='00000000-0000-0000-0000-0000000000f7';
insert into mall_builder_point_ledger (store_id, customer_id, kind, amount, remaining, note)
values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-00000000c7c7','earn',100,100,'적립');
delete from mall_builder_store_customers where id='00000000-0000-0000-0000-00000000c7c7';
select 'K5' t, (select count(*) from mall_builder_store_customers where id='00000000-0000-0000-0000-00000000c7c7') customer_left;
-- K6 돈 기록은 남음(연결만 비움)
select 'K6' t,
  (select count(*) from mall_builder_credit_ledger where order_id='00000000-0000-0000-0000-0000000000d7' or (customer_id is null and note='입금')) credit_rows,
  (select count(*) from mall_builder_point_ledger where customer_id is null and note='적립') point_rows,
  (select count(*) from mall_builder_reseller_ledger where reseller_id is null and store_id='00000000-0000-0000-0000-00000000005a') reseller_rows,
  (select count(*) from mall_builder_reseller_payouts where id='00000000-0000-0000-0000-0000000000f7' and reseller_id is null) payout_rows,
  (select customer_id is null from mall_builder_orders where id='00000000-0000-0000-0000-0000000000d7') order_kept_unlinked;
-- K7 몰 자체를 지우는 연쇄 삭제는 검사하지 않음(진행 중 주문이 있어도)
insert into mall_builder_stores (id, name, owner_id, slug) values ('00000000-0000-0000-0000-0000000005b7','지울몰','00000000-0000-0000-0000-0000000000a1','drop-mall');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone) values ('00000000-0000-0000-0000-00000000b7b7','00000000-0000-0000-0000-0000000005b7','00000000-0000-0000-0000-0000000000c7','유저','010-7777-0001');
insert into mall_builder_orders (store_id, seq, order_no, user_id, customer_id, receiver, depositor, status) values ('00000000-0000-0000-0000-0000000005b7',1,'D-1','00000000-0000-0000-0000-0000000000c7','00000000-0000-0000-0000-00000000b7b7','{"zip":"1"}','유저','paid');
delete from mall_builder_stores where id='00000000-0000-0000-0000-0000000005b7';
select 'K7' t, (select count(*) from mall_builder_stores where id='00000000-0000-0000-0000-0000000005b7') store_left;
