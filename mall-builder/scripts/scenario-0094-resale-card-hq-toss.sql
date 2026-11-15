-- 0094 분양몰 카드 결제 = 본사 토스 시나리오(로컬 Docker 전용). 운영 번들(0001~0094) → 0061 → 0062 시나리오 뒤에 같은 시험 DB에서 psql -f
-- 결과 줄 앞에 P1~P8. 토스 호출은 가짜 함수(어느 시크릿 키로 불렸는지 기록)로 바꾼다.
\set ON_ERROR_STOP 1
create table public.toss_fake_log (secret text, path text, at timestamptz default now());
create or replace function mall_builder_private.toss_call(p_secret text, p_method text, p_path text, p_body jsonb, p_idem text)
returns table (status integer, body jsonb) language plpgsql set search_path = '' as $$
begin
  insert into public.toss_fake_log (secret, path) values (p_secret, p_path);
  if p_path = '/v1/payments/confirm' then
    return query select 200, jsonb_build_object('status', 'DONE', 'orderId', p_body ->> 'orderId', 'totalAmount', (p_body ->> 'amount')::bigint, 'method', '카드', 'approvedAt', now()::text);
  else
    return query select 200, jsonb_build_object('status', 'CANCELED');
  end if;
end;
$$;

-- P1 본사가 키를 저장(분양몰은 이미 있음) → 분양몰에 복사
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select public.mall_builder_payment_save('00000000-0000-0000-0000-00000000005a', 'test_gck_hqclient01', true, 'test_gsk_hqsecret01');
select 'P1' t, ps.toss_client_key, ps.card_enabled, x.toss_secret_key = 'test_gsk_hqsecret01' secret_is_hq
  from mall_builder_stores s join mall_builder_store_payment_settings ps on ps.store_id = s.id join mall_builder_store_scheduler_secrets x on x.store_id = s.id where s.slug = 'my-shop';

-- P2 분양자가 자기 몰 키를 바꾸려 함 → 막힘
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
do $$ begin perform public.mall_builder_payment_save((select id from mall_builder_stores where slug='my-shop'), 'test_gck_myown0001', true, 'test_gsk_myown0001'); raise notice 'P2 분양자 키 저장 — 통과됨(문제)'; exception when others then raise notice 'P2 막힘: %', sqlerrm; end $$;

-- P3 본사 다른 비밀값(예약 작업 키)만 바뀜 → 오류 없음, 토스 키 그대로 / 본사가 카드를 끄면 분양몰도 꺼짐
update mall_builder_store_scheduler_secrets set cronjob_api_key = 'x' where store_id = '00000000-0000-0000-0000-00000000005a';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select public.mall_builder_payment_save('00000000-0000-0000-0000-00000000005a', 'test_gck_hqclient01', false, null);
select 'P3' t, (select card_enabled from mall_builder_store_payment_settings where store_id = (select id from mall_builder_stores where slug='my-shop')) resale_on_after_off,
  (select toss_secret_key = 'test_gsk_hqsecret01' from mall_builder_store_scheduler_secrets where store_id = (select id from mall_builder_stores where slug='my-shop')) secret_kept;
select public.mall_builder_payment_save('00000000-0000-0000-0000-00000000005a', 'test_gck_hqclient01', true, null);

-- P4 새 분양몰이 생기면 바로 본사 키
reset role;
insert into mall_builder_stores (id, name, owner_id, slug, kind, source_store_id, business_info, modules)
values ('00000000-0000-0000-0000-0000000000b4', '둘째 분양몰', '00000000-0000-0000-0000-0000000000e1', 'my-shop-b', 'resale', '00000000-0000-0000-0000-00000000005a', '{}', '{}');
select 'P4' t, ps.toss_client_key, ps.card_enabled, x.toss_secret_key = 'test_gsk_hqsecret01' secret_is_hq
  from mall_builder_store_payment_settings ps join mall_builder_store_scheduler_secrets x on x.store_id = ps.store_id where ps.store_id = '00000000-0000-0000-0000-0000000000b4';

-- P5 분양몰 유저 카드 주문 → 승인(본사 시크릿) → 결제 완료 + 본사 전달 주문
-- 거울 상품 담기(0063 시나리오 첫 줄과 같음)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
select mall_builder_resale_add((select id from mall_builder_stores where slug='my-shop'), array['00000000-0000-0000-0000-0000000000c1']::uuid[], 0) as added;
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c9','buyer@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000c9','buyer@x.test');
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, is_card)
values ('00000000-0000-0000-0000-0000000000f1',(select id from mall_builder_stores where slug='my-shop'),11,'R-C1','00000000-0000-0000-0000-0000000000c9','{"zip":"10228","receiver":"카드유저"}','카드유저', true);
insert into mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total, shipping_policy_id)
  select '00000000-0000-0000-0000-0000000000f1', m.id, v.id, m.name, v.key, m.base_price + v.extra_price, 1, m.base_price + v.extra_price, m.shipping_policy_id
    from mall_builder_products m join mall_builder_product_variants v on v.product_id = m.id and v.key='분홍' where m.source_product_id='00000000-0000-0000-0000-0000000000c1';
update mall_builder_orders set subtotal = (select sum(line_total) from mall_builder_order_items where order_id='00000000-0000-0000-0000-0000000000f1'), shipping_fee = 3500 where id='00000000-0000-0000-0000-0000000000f1';
update mall_builder_orders set total = subtotal + shipping_fee where id='00000000-0000-0000-0000-0000000000f1';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
select 'P5' t, public.mall_builder_card_confirm('00000000-0000-0000-0000-0000000000f1', 'payKeyFake0001', (select total from mall_builder_orders where id='00000000-0000-0000-0000-0000000000f1')) res;
select 'P5b' t, o.status, (select status from mall_builder_card_payments where order_id = o.id) card, h.order_no hq_no, h.status hq_status,
  (select string_agg((secret = 'test_gsk_hqsecret01')::text, ',') from public.toss_fake_log) used_hq_secret
  from mall_builder_orders o left join mall_builder_orders h on h.resale_order_id = o.id where o.id = '00000000-0000-0000-0000-0000000000f1';

-- P6 카드가 아닌(입금) 분양몰 주문은 유저·분양자가 결제 완료로 못 바꿈(기존 보호 그대로)
reset role;
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor)
values ('00000000-0000-0000-0000-0000000000f2',(select id from mall_builder_stores where slug='my-shop'),12,'R-B1','00000000-0000-0000-0000-0000000000c9','{"zip":"10228"}','입금유저');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
do $$ begin update public.mall_builder_orders set status='paid' where id='00000000-0000-0000-0000-0000000000f2'; raise notice 'P6 입금 주문 분양자 결제 완료 — 통과됨(문제)'; exception when others then raise notice 'P6 막힘: %', sqlerrm; end $$;
-- P7 카드 결제가 안 끝난 카드 주문도 못 바꿈
reset role;
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, receiver, depositor, is_card)
values ('00000000-0000-0000-0000-0000000000f3',(select id from mall_builder_stores where slug='my-shop'),13,'R-C2','00000000-0000-0000-0000-0000000000c9','{"zip":"10228"}','카드유저', true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c9', false);
do $$ begin update public.mall_builder_orders set status='paid' where id='00000000-0000-0000-0000-0000000000f3'; raise notice 'P7 미결제 카드 주문 결제 완료 — 통과됨(문제)'; exception when others then raise notice 'P7 막힘: %', sqlerrm; end $$;

-- P8 분양몰 운영사가 카드 주문 취소 → 본사 시크릿으로 환불 + 본사 전달 주문 취소
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
select 'P8' t, public.mall_builder_card_cancel_order('00000000-0000-0000-0000-0000000000f1', 'cancelled', '유저 요청') msg;
select 'P8b' t, o.status, (select status from mall_builder_card_payments where order_id = o.id) card, h.status hq_status,
  (select secret = 'test_gsk_hqsecret01' from public.toss_fake_log where path like '%/cancel' order by at desc limit 1) refund_hq_secret
  from mall_builder_orders o left join mall_builder_orders h on h.resale_order_id = o.id where o.id = '00000000-0000-0000-0000-0000000000f1';
