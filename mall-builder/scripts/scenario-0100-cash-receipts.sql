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

-- ── P1~P5 (B2B-20261116-07, QA05 P1): 발급 결과 모름(unknown) 중 취소·반품, 취소 중 상태 재변경 ──
-- 볼타 흉내 조절: post_noresp = 발급 요청에 응답 없음(→ unknown), status_key = 상태 조회 응답에 issuanceKey 포함
update mall_builder_stores set business_info = business_info || '{"phone":"02-1234-5678"}' where id = '00000000-0000-0000-0000-00000000005a';
create table public.fake_cr_mode (post_noresp boolean, status_key boolean);
insert into public.fake_cr_mode values (false, true);
create or replace function mall_builder_private.bolta_call(p_key text, p_method text, p_path text, p_body jsonb, p_ref text)
returns table (status integer, body jsonb) language plpgsql set search_path = '' as $$
begin
  insert into public.fake_cr_log values (p_method, p_path, p_body, p_ref);
  if p_path = '/v1/cashReceipts' then
    if (select post_noresp from public.fake_cr_mode limit 1) then return query select 500, null::jsonb; return; end if;
    return query select 202, jsonb_build_object('issuanceKey', 'ik-' || p_ref);
  elsif p_path like '/v1/cashReceipts/status%' then
    return query select 200, jsonb_build_object('status', (select s from public.fake_cr_status limit 1), 'cashReceiptApprovalNumber', 'AP123')
      || case when (select status_key from public.fake_cr_mode limit 1) then jsonb_build_object('issuanceKey', 'ik-' || split_part(p_path, 'clientReferenceId=', 2)) else '{}'::jsonb end;
  elsif p_path like '%/cancellation' then return query select 202, jsonb_build_object('issuanceKey', 'cancel-' || p_ref);
  end if;
  return query select 500, null::jsonb;
end;
$$;
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, status, total, is_card, is_credit) values
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-00000000005a',101,'P-1','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','paid',11000,false,false),
 ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-00000000005a',102,'P-2','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','paid',11000,false,false),
 ('00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-00000000005a',103,'P-3','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','delivered',33000,false,false),
 ('00000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-00000000005a',104,'P-4','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','paid',22000,false,false),
 ('00000000-0000-0000-0000-0000000000e5','00000000-0000-0000-0000-00000000005a',105,'P-5','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','paid',11000,false,false);
insert into mall_builder_order_items (order_id, name_snapshot, option_snapshot, unit_price, qty, line_total) values
 ('00000000-0000-0000-0000-0000000000e1','상품P1','',11000,1,11000), ('00000000-0000-0000-0000-0000000000e2','상품P2','',11000,1,11000),
 ('00000000-0000-0000-0000-0000000000e3','상품P3','',11000,3,33000), ('00000000-0000-0000-0000-0000000000e4','상품P4','',11000,2,22000),
 ('00000000-0000-0000-0000-0000000000e5','상품P5','',11000,1,11000);
-- 공통 준비: 유저가 결제 완료 주문에 신청 → 볼타 응답 없음 → unknown
update public.fake_cr_mode set post_noresp = true;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
select 'P0' t, o, public.mall_builder_cash_receipt_request(o, 'PHONE', '01012345678') ->> 'status' st
  from unnest(array['00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-0000000000e5']::uuid[]) o;
update public.fake_cr_mode set post_noresp = false;

-- P1 unknown 중 주문 취소 → 나중에 상태 조회가 ISSUED(발급 번호 포함) → 기대: 발급 완료로 남지 않고 취소 요청, 확정 뒤 다시 발급 없음
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
update mall_builder_orders set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000000e1';
select 'P1a' t, cash_receipt ->> 'status' st from mall_builder_orders where id = '00000000-0000-0000-0000-0000000000e1';
update public.fake_cr_status set s = 'ISSUED';
select 'P1b' t, (r ->> 'status') st, (r ->> 'issuance_key') k, '기대 cancelling' expect from (select public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e1') r) x;
update public.fake_cr_status set s = 'CANCELED';
select 'P1c' t, (r ->> 'status') st, (r ->> 'attempt') att, '기대 cancelled·attempt 1' expect from (select public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e1') r) x;
select 'P1d' t, count(*) filter (where path = '/v1/cashReceipts') posts, count(*) filter (where path like '%/cancellation') cancels, '기대 1·1' expect
  from public.fake_cr_log where coalesce(ref, path) like '%00000000-0000-0000-0000-0000000000e1%';

-- P2 같은 경우인데 상태 조회 응답에 발급 번호가 없음 → 기대: 조용히 발급 완료로 남지 않고 「취소 안 됨」으로 보임, 볼타 추가 호출 없음
update mall_builder_orders set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000000e2';
update public.fake_cr_mode set status_key = false;
update public.fake_cr_status set s = 'ISSUED';
select 'P2' t, (r ->> 'status') st, left(r ->> 'error', 40) err, '기대 cancel_failed' expect from (select public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e2') r) x;
select 'P2b' t, count(*) filter (where path like '%/cancellation') cancels, count(*) filter (where path = '/v1/cashReceipts') posts, '기대 0·1' expect
  from public.fake_cr_log where coalesce(ref, path) like '%00000000-0000-0000-0000-0000000000e2%';
update public.fake_cr_mode set status_key = true;

-- P3 unknown 중 반품(33,000 중 30,000 환불) → ISSUED → 기대: 전액 취소 요청(남은 3,000 다시 발급 예정) → CANCELED → 3,000 발급
update mall_builder_orders set refund_status = 'done', refund_amount = 30000 where id = '00000000-0000-0000-0000-0000000000e3';
update mall_builder_orders set status = 'returned' where id = '00000000-0000-0000-0000-0000000000e3';
update public.fake_cr_status set s = 'ISSUED';
select 'P3a' t, (r ->> 'status') st, (r ->> 'reissue_amount') re, '기대 cancelling·3000' expect from (select public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e3') r) x;
update public.fake_cr_status set s = 'CANCELED';
select 'P3b' t, (r ->> 'status') st, (r ->> 'amount') amt, (r ->> 'attempt') att, '기대 issuing·3000·2' expect from (select public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e3') r) x;

-- P4 발급 완료 → 운영사 「취소 후 다시 발급」(금액 변경) → 취소 확정 전에 주문이 취소됨 → 기대: 옛 다시 발급 금액으로 되살리지 않음
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
select 'P4a' t, public.mall_builder_cash_receipt_request('00000000-0000-0000-0000-0000000000e4', 'PHONE', '01012345678') ->> 'status' st;
update public.fake_cr_status set s = 'ISSUED';
select 'P4b' t, public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e4') ->> 'status' st;
update mall_builder_orders set refund_status = 'done', refund_amount = 11000 where id = '00000000-0000-0000-0000-0000000000e4';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select 'P4c' t, (r ->> 'status') st, (r ->> 'reissue_amount') re from (select public.mall_builder_cash_receipt_staff('00000000-0000-0000-0000-0000000000e4', 'reissue') r) x;
update mall_builder_orders set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000000e4';
update public.fake_cr_status set s = 'CANCELED';
select 'P4d' t, (r ->> 'status') st, (r ->> 'attempt') att, '기대 cancelled·attempt 1' expect from (select public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e4') r) x;

-- P5 unknown → 볼타 아직 처리 중(PENDING) → issuing(발급 번호 기록) → ISSUED → 정상 주문은 발급 완료, 다시 확인해도 볼타 추가 호출 없음
update public.fake_cr_status set s = 'PENDING';
select 'P5a' t, (r ->> 'status') st, (r ->> 'issuance_key') <> '' has_key, '기대 issuing·true' expect from (select public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e5') r) x;
update public.fake_cr_status set s = 'ISSUED';
select 'P5b' t, (r ->> 'status') st, '기대 issued' expect from (select public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e5') r) x;
create temp table p5n as select count(*) n from public.fake_cr_log;
select 'P5c' t, public.mall_builder_cash_receipt_recheck('00000000-0000-0000-0000-0000000000e5') ->> 'status' st, (select count(*) from public.fake_cr_log) - (select n from p5n) new_calls, '기대 issued·0' expect;
