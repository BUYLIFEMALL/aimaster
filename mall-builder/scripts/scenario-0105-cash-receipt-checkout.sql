-- 0105 주문서 현금영수증 자동 접수 시나리오(로컬 Docker 격리 DB 전용, 외부망·실제 볼타 호출 0).
-- 실행기: node mall-builder/scripts/check-0105-local.mjs (0001~0105 적용한 새 DB에서 이 파일 → 두 세션 순서 시험).
-- 결과 줄: K번호 <탭> t/f (모두 t여야 통과). 입력값(번호)은 결과에 내보내지 않는다.
\set ON_ERROR_STOP 1
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false) \g /dev/null
-- 볼타 흉내(0100 시나리오와 같은 모양): 부른 내용만 기록
create table public.fake_cr_log (method text, path text, body jsonb, ref text);
create or replace function mall_builder_private.bolta_call(p_key text, p_method text, p_path text, p_body jsonb, p_ref text)
returns table (status integer, body jsonb) language plpgsql set search_path = '' as $$
begin
  insert into public.fake_cr_log values (p_method, p_path, p_body, p_ref);
  if p_path = '/v1/cashReceipts' then return query select 202, jsonb_build_object('issuanceKey', 'ik-' || p_ref); end if;
  return query select 500, null::jsonb;
end;
$$;
update mall_builder_stores set business_info = business_info || '{"business_no":"220-81-62517","company_name":"본사상회","ceo_name":"대표","phone":"02-1234-5678"}' where id = '00000000-0000-0000-0000-00000000005a';
insert into mall_builder_store_scheduler_secrets (store_id, bolta_api_key) values ('00000000-0000-0000-0000-00000000005a', 'test_key') on conflict (store_id) do update set bolta_api_key = 'test_key';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c9','buyer9@x.test'), ('00000000-0000-0000-0000-0000000000ca','other@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000c9','buyer9@x.test'), ('00000000-0000-0000-0000-0000000000ca','other@x.test');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone) values ('00000000-0000-0000-0000-00000000c9c9','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000c9','영수증유저','010-9999-0000');
-- 주문: e1 정상 / e2 입금 완료 / e3 카드 / e4 외상 / e5 0원 / e6 세금계산서 / e7 이미 신청 / e8 형식 오류용 / e9·ea 두 세션 순서용
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, status, total, is_card, is_credit) values
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-00000000005a',101,'CK-1','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',33000,false,false),
 ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-00000000005a',102,'CK-2','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','paid',22000,false,false),
 ('00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-00000000005a',103,'CK-3','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',22000,true,false),
 ('00000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-00000000005a',104,'CK-4','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',22000,false,true),
 ('00000000-0000-0000-0000-0000000000e5','00000000-0000-0000-0000-00000000005a',105,'CK-5','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',0,false,false),
 ('00000000-0000-0000-0000-0000000000e6','00000000-0000-0000-0000-00000000005a',106,'CK-6','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',22000,false,false),
 ('00000000-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-00000000005a',107,'CK-7','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',22000,false,false),
 ('00000000-0000-0000-0000-0000000000e8','00000000-0000-0000-0000-00000000005a',108,'CK-8','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',22000,false,false),
 ('00000000-0000-0000-0000-0000000000e9','00000000-0000-0000-0000-00000000005a',109,'CK-9','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',22000,false,false),
 ('00000000-0000-0000-0000-0000000000ea','00000000-0000-0000-0000-00000000005a',110,'CK-10','00000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-00000000c9c9','{"zip":"1"}','영수증유저','pending_payment',22000,false,false);
insert into mall_builder_order_items (order_id, name_snapshot, option_snapshot, unit_price, qty, line_total)
 select id, '시험 상품', '', total, 1, total from mall_builder_orders where id::text like '00000000-0000-0000-0000-0000000000e%' and total > 0;
update mall_builder_orders set tax_invoice = '{"status":"requested"}' where id = '00000000-0000-0000-0000-0000000000e6';
update mall_builder_orders set cash_receipt = '{"type":"PHONE","value":"010-0000-0000","purpose":"INCOME_DEDUCTION","status":"requested","attempt":0,"error":""}' where id = '00000000-0000-0000-0000-0000000000e7';

create temp table r (k text, ok boolean);
-- K1 권한: 비로그인(anon)·PUBLIC 실행 불가, 로그인 회원 실행 가능
insert into r select 'K1', not has_function_privilege('anon', 'public.mall_builder_cash_receipt_checkout(uuid,text,text,text)', 'execute')
  and not has_function_privilege('public', 'public.mall_builder_cash_receipt_checkout(uuid,text,text,text)', 'execute')
  and has_function_privilege('authenticated', 'public.mall_builder_cash_receipt_checkout(uuid,text,text,text)', 'execute');
-- K2 로그인 없음 → 오류
select set_config('request.jwt.claim.sub', '', false);
do $$ begin perform public.mall_builder_cash_receipt_checkout('00000000-0000-0000-0000-0000000000e1', 'PHONE', '01012345678'); insert into r values ('K2', false);
exception when others then insert into r values ('K2', sqlerrm = '로그인이 필요합니다.'); end $$;
-- K3 설정 꺼짐 → not_eligible(예외 없음), 주문 그대로
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c9', false);
insert into r select 'K3', public.mall_builder_cash_receipt_checkout('00000000-0000-0000-0000-0000000000e1', 'PHONE', '01012345678') = '{"accepted": false, "reason": "not_eligible"}'::jsonb
  and (select cash_receipt is null from mall_builder_orders where id = '00000000-0000-0000-0000-0000000000e1');
-- 대표가 켬
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select public.mall_builder_cash_receipt_settings_save('00000000-0000-0000-0000-00000000005a', true) \g /dev/null
-- K4 남의 주문 → 오류(접수 조건 판정 전, 잠금 아래 본인 확인)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ca', false);
do $$ begin perform public.mall_builder_cash_receipt_checkout('00000000-0000-0000-0000-0000000000e1', 'PHONE', '01012345678'); insert into r values ('K4', false);
exception when others then insert into r values ('K4', sqlerrm = '주문을 찾을 수 없습니다.'); end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c9', false);
-- K5 정상 접수: 응답은 {accepted:true}만, 「신청」 기록, 시도 0, 볼타 호출 0
-- (한 문장 안의 하위 조회는 문장 시작 시점 자료를 보므로 호출과 확인을 나눈다)
insert into r select 'K5a', public.mall_builder_cash_receipt_checkout('00000000-0000-0000-0000-0000000000e1', 'PHONE', '010 1234 5678', 'INCOME_DEDUCTION') = '{"accepted": true}'::jsonb;
insert into r select 'K5b', (select cash_receipt ->> 'status' = 'requested' and (cash_receipt ->> 'attempt')::int = 0 from mall_builder_orders where id = '00000000-0000-0000-0000-0000000000e1')
  and (select count(*) = 0 from public.fake_cr_log);
-- K6 같은 주문 다시(중복) → not_eligible, 기록 그대로
insert into r select 'K6', public.mall_builder_cash_receipt_checkout('00000000-0000-0000-0000-0000000000e1', 'BUSINESS_REGISTRATION_NUMBER', '2208162517') = '{"accepted": false, "reason": "not_eligible"}'::jsonb
  and (select cash_receipt ->> 'type' = 'PHONE' from mall_builder_orders where id = '00000000-0000-0000-0000-0000000000e1');
-- K7 입금 완료·카드·외상·0원·세금계산서·이미 신청 → 모두 not_eligible, 볼타 호출 0, 해당 주문 영수증 칸 그대로
insert into r select 'K7', bool_and(public.mall_builder_cash_receipt_checkout(x.id, 'PHONE', '01012345678') = '{"accepted": false, "reason": "not_eligible"}'::jsonb)
  from (values ('00000000-0000-0000-0000-0000000000e2'::uuid), ('00000000-0000-0000-0000-0000000000e3'), ('00000000-0000-0000-0000-0000000000e4'),
               ('00000000-0000-0000-0000-0000000000e5'), ('00000000-0000-0000-0000-0000000000e6'), ('00000000-0000-0000-0000-0000000000e7')) x(id);
insert into r select 'K7b', (select count(*) = 0 from public.fake_cr_log)
  and (select count(*) = 5 from mall_builder_orders where id in ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-0000000000e5','00000000-0000-0000-0000-0000000000e6') and cash_receipt is null)
  and (select cash_receipt ->> 'value' = '010-0000-0000' from mall_builder_orders where id = '00000000-0000-0000-0000-0000000000e7');
-- K8 형식 오류 → 기존 고정 문구 예외, 입력값이 문구에 없음, 영수증 칸 그대로(전체 취소)
do $$ begin perform public.mall_builder_cash_receipt_checkout('00000000-0000-0000-0000-0000000000e8', 'PHONE', '0212345678'); insert into r values ('K8', false);
exception when others then insert into r values ('K8', sqlerrm = '휴대폰 번호(010으로 시작하는 11자리)를 넣어 주세요.' and position('0212345678' in sqlerrm) = 0); end $$;
insert into r select 'K8b', (select cash_receipt is null from mall_builder_orders where id = '00000000-0000-0000-0000-0000000000e8');
-- K9 접수된 주문을 운영사가 입금 확인 → 0100 트리거로 발급 요청(기존 흐름 그대로)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select public.mall_builder_change_order_status('00000000-0000-0000-0000-0000000000e1', 'paid', '', '', '') \g /dev/null
insert into r select 'K9', (select count(*) = 1 from public.fake_cr_log where path = '/v1/cashReceipts')
  and (select cash_receipt ->> 'status' <> 'requested' from mall_builder_orders where id = '00000000-0000-0000-0000-0000000000e1');
-- K10 기존 주문 상세 경로 회귀: 입금 완료 주문(e2)에 기존 신청 함수 → 바로 발급 요청(0100 그대로)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c9', false);
select public.mall_builder_cash_receipt_request('00000000-0000-0000-0000-0000000000e2', 'PHONE', '01012345678') \g /dev/null
insert into r select 'K10', (select count(*) = 2 from public.fake_cr_log where path = '/v1/cashReceipts');
select k || E'\t' || case when ok then 't' when not ok then 'f' else 'n' end from r order by k;
