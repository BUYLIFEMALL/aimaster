-- 0075 리셀러 출금(최소 금액·공제·이체금액·저장 계좌) 시나리오(로컬 Docker 전용, 단독)
-- 몰 scn(대표 a1), 리셀러 R1(손님 c1·f1, 개인, 저장 계좌 국민), 다른 사람 e9
\set ON_ERROR_STOP 1
insert into auth.users (id, email) select ('00000000-0000-0000-0000-0000000000' || x)::uuid, x || '@x.test' from unnest(array['a1','f1','e9']) x;
insert into public.profiles (id, email) select ('00000000-0000-0000-0000-0000000000' || x)::uuid, x || '@x.test' from unnest(array['a1','f1','e9']) x;
insert into mall_builder_stores (id, name, owner_id, slug, status) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','scn','active');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone) values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f1','리셀러','010-1111-2222');
insert into mall_builder_resellers (id, store_id, customer_id, code, rate, active, payee_type, bank_name, bank_account, bank_holder)
values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000c1','RSLR01',2,true,'individual','국민','123-456-789012','김리셀');
select mall_builder_private.reseller_add('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000e1', null, null, 'adjust', 50000, '시험 잔고');
grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;

-- 1 최소 금액: 남은 못 바꿈, 대표가 30,000원으로
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e9', false);
set role authenticated;
do $$ begin perform mall_builder_reseller_payout_min_set('00000000-0000-0000-0000-00000000005a', 1000); raise notice '1a 남 — 통과됨(문제)'; exception when others then raise notice '1a 막힘: %', sqlerrm; end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select mall_builder_reseller_payout_min_set('00000000-0000-0000-0000-00000000005a', 30000);
reset role;
select '1 최소 금액' t, reseller_payout_min from mall_builder_stores;

-- 2 리셀러: 20,000원은 최소 미만으로 막힘 → 40,000원을 계좌 비우고 신청(저장 계좌 사용)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', false);
set role authenticated;
do $$ begin perform mall_builder_reseller_request_payout('00000000-0000-0000-0000-00000000005a', 20000, '', '', ''); raise notice '2a 최소 미만 — 통과됨(문제)'; exception when others then raise notice '2a 막힘: %', sqlerrm; end $$;
select '2 요약(신청 전)' t, s->>'balance' bal, s->>'payout_min' min, s->>'saved_bank' saved, s->>'payee_type' payee, s->>'scheduled' sched from mall_builder_reseller_my_summary('00000000-0000-0000-0000-00000000005a') s;
select mall_builder_reseller_request_payout('00000000-0000-0000-0000-00000000005a', 40000, '', '', '') as pid \gset
reset role;
select '2b 신청' t, amount, bank_name, bank_account, bank_holder, payee_type, status from mall_builder_reseller_payouts;

-- 3 운영자 지급: 공제가 신청 금액보다 크면 막힘, 3.3% 공제(1,320원) → 이체 38,680원
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
do $$ begin perform mall_builder_reseller_payout_pay((select id from mall_builder_reseller_payouts limit 1), 50000, ''); raise notice '3a 공제 초과 — 통과됨(문제)'; exception when others then raise notice '3a 막힘: %', sqlerrm; end $$;
select '3 지급' t, mall_builder_reseller_payout_pay(:'pid', 1320, '사업소득 3.3% 원천징수') transfer;
reset role;
select '3b 기록' t, status, amount, deduction, transfer_amount, reason from mall_builder_reseller_payouts;

-- 4 두 번째 신청 → 반려 → 잔고 돌려줌(옛 함수 그대로)
select mall_builder_private.reseller_add('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000e1', null, null, 'adjust', 30000, '시험 잔고 2');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', false);
set role authenticated;
select mall_builder_reseller_request_payout('00000000-0000-0000-0000-00000000005a', 30000, '신한', '987-654-321', '김리셀') as pid2 \gset
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select mall_builder_reseller_decide_payout(:'pid2', 'rejected', '계좌 확인 필요');
reset role;
select '4 반려 뒤 잔고' t, (select sum(amount) from mall_builder_reseller_ledger) bal, (select bank_name from mall_builder_reseller_payouts where id = :'pid2') bank;
