-- 0099 반품·환불 시나리오(로컬 Docker 전용). 운영 번들 → 0061 시나리오(본사 hq-mall, 대표 a1) 뒤에 같은 시험 DB에서 psql -f. 결과 줄 앞에 R1~R10.
\set ON_ERROR_STOP 1
create table public.toss_fake_log2 (path text, amount bigint);
create or replace function mall_builder_private.toss_call(p_secret text, p_method text, p_path text, p_body jsonb, p_idem text)
returns table (status integer, body jsonb) language plpgsql set search_path = '' as $$
begin
  insert into public.toss_fake_log2 values (p_path, (p_body ->> 'cancelAmount')::bigint);
  return query select 200, jsonb_build_object('status', 'CANCELED');
end;
$$;
update mall_builder_stores set settings = coalesce(settings, '{}'::jsonb) || '{"return_fee": 6000}' where id = '00000000-0000-0000-0000-00000000005a';
insert into mall_builder_store_scheduler_secrets (store_id, toss_secret_key) values ('00000000-0000-0000-0000-00000000005a', 'test_gsk_x') on conflict (store_id) do update set toss_secret_key = 'test_gsk_x';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c8','buyer8@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000c8','buyer8@x.test');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone) values ('00000000-0000-0000-0000-00000000c8c8','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000c8','반품손님','010-8888-0000');
-- 무통장(B)·카드(C)·외상(K) 배송 완료 주문 각 30,000원
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, status, total, is_card, is_credit) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000005a',81,'B-1','00000000-0000-0000-0000-0000000000c8','00000000-0000-0000-0000-00000000c8c8','{"zip":"1"}','반품손님','delivered',30000,false,false),
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-00000000005a',82,'C-1','00000000-0000-0000-0000-0000000000c8','00000000-0000-0000-0000-00000000c8c8','{"zip":"1"}','반품손님','delivered',30000,true,false),
 ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-00000000005a',83,'K-1','00000000-0000-0000-0000-0000000000c8','00000000-0000-0000-0000-00000000c8c8','{"zip":"1"}','반품손님','delivered',30000,false,true),
 ('00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-00000000005a',84,'B-2','00000000-0000-0000-0000-0000000000c8','00000000-0000-0000-0000-00000000c8c8','{"zip":"1"}','반품손님','cancel_requested',20000,false,false);
insert into mall_builder_card_payments (store_id, order_id, payment_key, amount, status) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000b2','payKeyFakeR1',30000,'done');
insert into mall_builder_credit_ledger (store_id, customer_id, order_id, kind, amount, balance_after, note) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-00000000c8c8','00000000-0000-0000-0000-0000000000b3','charge',30000,30000,'외상 주문');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c8', false);
-- R1 무통장 반품은 환불 계좌 없으면 막힘
do $$ begin perform public.mall_builder_request_return('00000000-0000-0000-0000-0000000000b1', 'change_mind', '마음이 바뀜', null); raise notice 'R1 통과됨(문제)'; exception when others then raise notice 'R1 막힘: %', sqlerrm; end $$;
-- R2 무통장 반품 요청(변심 → 반품비 6,000), 카드(불량 → 0), 외상(변심 → 6,000)
select 'R2' t, public.mall_builder_request_return('00000000-0000-0000-0000-0000000000b1', 'change_mind', '마음이 바뀜', '{"bank_name":"국민","bank_account":"123-456-789","bank_holder":"반품손님"}'),
  public.mall_builder_request_return('00000000-0000-0000-0000-0000000000b2', 'defect', '불량', null),
  public.mall_builder_request_return('00000000-0000-0000-0000-0000000000b3', 'change_mind', '', null);
select 'R2b' t, order_no, status, return_reason, return_step, return_fee from mall_builder_orders where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b3') order by order_no;
-- R3 손님은 회수 단계를 못 바꿈
do $$ begin perform public.mall_builder_return_step('00000000-0000-0000-0000-0000000000b1', 'collected'); raise notice 'R3 통과됨(문제)'; exception when others then raise notice 'R3 막힘: %', sqlerrm; end $$;
-- R4 운영사 회수 중(송장 없으면 막힘) → 회수 중 → 회수 완료
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
do $$ begin perform public.mall_builder_return_step('00000000-0000-0000-0000-0000000000b1', 'collecting'); raise notice 'R4a 통과됨(문제)'; exception when others then raise notice 'R4a 막힘: %', sqlerrm; end $$;
select 'R4' t, public.mall_builder_return_step('00000000-0000-0000-0000-0000000000b1', 'collecting', 'CJ대한통운', 'RT-1'), public.mall_builder_return_step('00000000-0000-0000-0000-0000000000b1', 'collected');
-- R5 반품비가 결제보다 크면 막힘
do $$ begin perform public.mall_builder_approve_return('00000000-0000-0000-0000-0000000000b1', 40000); raise notice 'R5 통과됨(문제)'; exception when others then raise notice 'R5 막힘: %', sqlerrm; end $$;
-- R6 무통장 승인(반품비 6,000) → 환불 대기 24,000
select 'R6' t, public.mall_builder_approve_return('00000000-0000-0000-0000-0000000000b1', 6000);
select 'R6b' t, status, refund_status, refund_amount, (select count(*) from mall_builder_refund_accounts where order_id='00000000-0000-0000-0000-0000000000b1') account from mall_builder_orders where id='00000000-0000-0000-0000-0000000000b1';
-- R7 카드 승인(반품비 3,000으로 고침) → 카드 27,000만 부분 환불, 환불 완료
select 'R7' t, public.mall_builder_approve_return('00000000-0000-0000-0000-0000000000b2', 3000);
select 'R7b' t, o.status, o.refund_status, o.refund_amount, cp.status card, cp.canceled_amount, (select amount from public.toss_fake_log2 order by 1 limit 1) toss_cancel from mall_builder_orders o join mall_builder_card_payments cp on cp.order_id = o.id where o.id='00000000-0000-0000-0000-0000000000b2';
-- R8 외상 승인(6,000) → 외상 잔액 = 반품비 6,000만 남음
select 'R8' t, public.mall_builder_approve_return('00000000-0000-0000-0000-0000000000b3', 6000);
select 'R8b' t, (select sum(amount) from mall_builder_credit_ledger where customer_id='00000000-0000-0000-0000-00000000c8c8') credit_balance, (select refund_status from mall_builder_orders where id='00000000-0000-0000-0000-0000000000b3') refund;
-- R9 무통장 결제 후 취소 승인(기존 상태 함수) → 환불 대기 20,000(반품비 없음), 유저가 계좌 넣기
select public.mall_builder_change_order_status('00000000-0000-0000-0000-0000000000b4', 'cancelled', '', '', '');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c8', false);
select public.mall_builder_set_refund_account('00000000-0000-0000-0000-0000000000b4', '{"bank_name":"신한","bank_account":"110-222-333","bank_holder":"반품손님"}');
select 'R9' t, refund_status, refund_amount, (select bank_name from mall_builder_refund_accounts where order_id='00000000-0000-0000-0000-0000000000b4') bank from mall_builder_orders where id='00000000-0000-0000-0000-0000000000b4';
-- R10 손님은 환불 완료를 못 누름, 운영사가 누르면 완료·계좌 삭제
do $$ begin perform public.mall_builder_refund_done('00000000-0000-0000-0000-0000000000b1'); raise notice 'R10a 통과됨(문제)'; exception when others then raise notice 'R10a 막힘: %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select 'R10' t, public.mall_builder_refund_done('00000000-0000-0000-0000-0000000000b1', '국민 이체') is not null done;
select 'R10b' t, refund_status, refunded_at is not null at, (select count(*) from mall_builder_refund_accounts where order_id='00000000-0000-0000-0000-0000000000b1') account_left,
  (select note from mall_builder_order_events where order_id='00000000-0000-0000-0000-0000000000b1' order by created_at desc limit 1) last_event from mall_builder_orders where id='00000000-0000-0000-0000-0000000000b1';
