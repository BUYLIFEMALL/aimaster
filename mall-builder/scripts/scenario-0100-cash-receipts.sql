-- 0100 현금영수증 시나리오(로컬 Docker 전용). 운영 번들 → 0061 시나리오(본사 hq-mall, 대표 a1) 뒤에 같은 시험 DB에서 psql -f. 결과 줄 앞에 C1~C10.
\set ON_ERROR_STOP 1
-- 볼타 흉내: 부른 내용 기록, 상태 조회는 fake_cr_status 값으로 답함
create table public.fake_cr_log (method text, path text, body jsonb, ref text);
create table public.fake_cr_status (s text);
insert into public.fake_cr_status values ('ISSUED');
create or replace function mall_builder_private.bolta_call(p_key text, p_method text, p_path text, p_body jsonb, p_ref text)
returns table (status integer, body jsonb) language plpgsql set search_path = '' as $$
begin
  insert into public.fake_cr_log values (p_method, p_path, p_body, p_ref);
  if p_path = '/v1/cashReceipts' then return query select 202, jsonb_build_object('issuanceKey', 'ik-' || p_ref);
  elsif p_path like '/v1/cashReceipts/status%' then return query select 200, jsonb_build_object('status', (select s from public.fake_cr_status limit 1), 'cashReceiptApprovalNumber', 'AP123');
  elsif p_path like '%/cancellation' then return query select 202, jsonb_build_object('issuanceKey', 'cancel-' || p_ref);
  end if;
  return query select 500, null::jsonb;
end;
$$;
update mall_builder_stores set business_info = business_info || '{"business_no":"220-81-62517","company_name":"본사상회","ceo_name":"대표","phone":"02-1234-5678"}' where id = '00000000-0000-0000-0000-00000000005a';
insert into mall_builder_store_scheduler_secrets (store_id, bolta_api_key) values ('00000000-0000-0000-0000-00000000005a', 'test_key') on conflict (store_id) do update set bolta_api_key = 'test_key';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c9','buyer9@x.test'), ('00000000-0000-0000-0000-0000000000ca','other@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000c9','buyer9@x.test'), ('00000000-0000-0000-0000-0000000000ca','other@x.test');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone) values ('00000000-0000-0000-0000-00000000c9c9','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000c9','영수증유저','010-9999-0000');
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, status, total, is_card, is_credit) values
 ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000005a',91,'CR-1','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',33000,false,false),
 ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-00000000005a',92,'CR-2','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','paid',22000,true,false),
 ('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-00000000005a',93,'CR-3','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','delivered',11000,false,false);
insert into mall_builder_order_items (order_id, name_snapshot, option_snapshot, unit_price, qty, line_total) values
 ('00000000-0000-0000-0000-0000000000d1','아주 긴 이름의 시험 상품 하나입니다','',11000,3,33000),
 ('00000000-0000-0000-0000-0000000000d3','작은 상품','',11000,1,11000);

-- C1 꺼진 몰은 신청 막힘
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
do $$ begin perform public.mall_builder_cash_receipt_request('00000000-0000-0000-0000-0000000000d1', 'PHONE', '01012345678'); raise notice 'C1 통과됨(문제)'; exception when others then raise notice 'C1 막힘: %', sqlerrm; end $$;
-- 대표가 켬
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select 'C0' t, public.mall_builder_cash_receipt_settings_save('00000000-0000-0000-0000-00000000005a', true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
-- C2 카드 주문·잘못된 번호·남의 주문 막힘
do $$ begin perform public.mall_builder_cash_receipt_request('00000000-0000-0000-0000-0000000000d2', 'PHONE', '01012345678'); raise notice 'C2a 통과됨(문제)'; exception when others then raise notice 'C2a 막힘: %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_cash_receipt_request('00000000-0000-0000-0000-0000000000d1', 'PHONE', '0212345678'); raise notice 'C2b 통과됨(문제)'; exception when others then raise notice 'C2b 막힘: %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000ca', false);
do $$ begin perform public.mall_builder_cash_receipt_request('00000000-0000-0000-0000-0000000000d1', 'PHONE', '01012345678'); raise notice 'C2c 통과됨(문제)'; exception when others then raise notice 'C2c 막힘: %', sqlerrm; end $$;
-- C3 입금 전 신청 → 신청만(볼타 안 부름)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
select 'C3' t, public.mall_builder_cash_receipt_request('00000000-0000-0000-0000-0000000000d1', 'PHONE', '010 1234 5678', 'INCOME_DEDUCTION') ->> 'status' st, (select count(*) from public.fake_cr_log) calls;
-- C4 세금계산서 함께 요청 막힘
do $$ begin update mall_builder_orders set tax_invoice = '{"status":"requested"}' where id = '00000000-0000-0000-0000-0000000000d1'; raise notice 'C4 통과됨(문제)'; exception when others then raise notice 'C4 막힘: %', sqlerrm; end $$;
-- C5 운영사 입금 확인 → 자동 발급 요청
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select public.mall_builder_change_order_status('00000000-0000-0000-0000-0000000000d1', 'paid', '', '', '');
select 'C5' t, cash_receipt ->> 'status' st, cash_receipt ->> 'amount' amt,
  (select body -> 'recipient' from public.fake_cr_log where path = '/v1/cashReceipts' limit 1) recipient,
  (select body -> 'amount' from public.fake_cr_log where path = '/v1/cashReceipts' limit 1) amount,
  (select body ->> 'itemName' from public.fake_cr_log where path = '/v1/cashReceipts' limit 1) item
  from mall_builder_orders where id = '00000000-0000-0000-0000-0000000000d1';
-- C6 상태 확인 → 발급 완료·승인번호(유저도 확인 가능)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
select 'C6' t, (r ->> 'status') st, (r ->> 'approval_no') ap from (select public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000d1') r) x;
-- C7 다른 유저는 확인 못 함
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000ca', false);
do $$ begin perform public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000d1'); raise notice 'C7 통과됨(문제)'; exception when others then raise notice 'C7 막힘: %', sqlerrm; end $$;
-- C8 반품 완료(반품비 3,000 빼고 30,000 환불) → 자동 전액 취소, 취소 확정 뒤 남은 3,000 다시 발급
update mall_builder_orders set refund_status = 'done', refund_amount = 30000 where id = '00000000-0000-0000-0000-0000000000d1';
update mall_builder_orders set status = 'returned' where id = '00000000-0000-0000-0000-0000000000d1';
select 'C8a' t, cash_receipt ->> 'status' st, cash_receipt ->> 'reissue_amount' re from mall_builder_orders where id = '00000000-0000-0000-0000-0000000000d1';
update public.fake_cr_status set s = 'CANCELED';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select 'C8b' t, (r ->> 'status') st, (r ->> 'amount') amt, (r ->> 'attempt') att from (select public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000d1') r) x;
select 'C8c' t, body -> 'amount' from public.fake_cr_log where path = '/v1/cashReceipts' order by ref desc limit 1;
-- C9 이미 결제 완료(배송 완료) 주문에 사업자번호로 신청 → 바로 발급 요청
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
select 'C9' t, (r ->> 'status') st, (r ->> 'purpose') pu, (r ->> 'value') v from (select public.mall_builder_cash_receipt_request('00000000-0000-0000-0000-0000000000d3', 'BUSINESS_REGISTRATION_NUMBER', '123-45-67890') r) x;
-- C10 쇼핑몰 전화번호가 없으면 거절로 남고, 운영사 「다시 발급」은 실패 때만
update mall_builder_stores set business_info = business_info - 'phone' where id = '00000000-0000-0000-0000-00000000005a';
update mall_builder_orders set cash_receipt = cash_receipt || '{"status":"failed"}' where id = '00000000-0000-0000-0000-0000000000d3';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select 'C10' t, (r ->> 'status') st, (r ->> 'error') err from (select public.mall_builder_cash_receipt_staff('00000000-0000-0000-0000-0000000000d3', 'retry') r) x;
select 'C10b' t, count(*) events from mall_builder_order_events where note like '현금영수증%';
