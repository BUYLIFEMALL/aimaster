-- 0061 분양 신청·승인 시나리오(로컬 Docker 전용, 2026-11-13). 흉내 틀+묶음을 적용한 시험 DB에서 psql -f 로 실행
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test'),('00000000-0000-0000-0000-0000000000e1','reseller@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test'),('00000000-0000-0000-0000-0000000000e1','reseller@x.test');
insert into mall_builder_stores (id, name, owner_id, slug, business_info) values ('00000000-0000-0000-0000-00000000005a','본사몰','00000000-0000-0000-0000-0000000000a1','hq-mall','{"bank_name":"국민","bank_account":"111","bank_holder":"본사"}');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
do $$ begin perform mall_builder_resale_apply('hq-mall','{"slug":"my-shop","name":"내 가게"}'); raise notice '1 분양 꺼진 몰 신청 — 통과됨(문제)'; exception when others then raise notice '1 막힘: %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '2 분양 받기 켬' t, mall_builder_resale_set_open('00000000-0000-0000-0000-00000000005a', true);
select '3 공개 목록' t, slug from mall_builder_resale_sources();
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
select mall_builder_resale_apply('hq-mall','{"slug":"my-shop","name":"내 가게","phone":"010-1111-2222","channel":"인스타"}') as app \gset
do $$ begin perform mall_builder_resale_apply('hq-mall','{"slug":"my-shop2","name":"둘째"}'); raise notice '4 중복 신청 — 통과됨(문제)'; exception when others then raise notice '4 막힘: %', sqlerrm; end $$;
do $$ begin perform mall_builder_resale_decide((select id from mall_builder_resale_applications limit 1),'approve',14,''); raise notice '5 신청자가 스스로 승인 — 통과됨(문제)'; exception when others then raise notice '5 막힘: %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '6 승인' t, mall_builder_resale_decide(:'app','approve',14,'환영합니다');
select '7 분양몰' t, kind, (source_store_id is not null) has_src, resale_expires_at > now() + interval '13 days' as period_ok, business_info ->> 'bank_account' bank,
  (select role from mall_builder_store_staff st where st.store_id = s.id and st.user_id='00000000-0000-0000-0000-0000000000e1') role
  from mall_builder_stores s where slug='my-shop';
-- 분양자가 계좌를 바꾸려 하면(로그인 사용자 역할로)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', false);
set role authenticated;
do $$ begin update public.mall_builder_stores set business_info = business_info || '{"bank_account":"999"}' where slug='my-shop'; raise notice '8 분양자 계좌 변경 — 통과됨(문제) %', (select business_info->>'bank_account' from public.mall_builder_stores where slug='my-shop'); exception when others then raise notice '8 막힘: %', sqlerrm; end $$;
do $$ begin update public.mall_builder_stores set resale_expires_at = now() + interval '999 days' where slug='my-shop'; raise notice '9 분양자 기간 연장 — 통과됨(문제)'; exception when others then raise notice '9 막힘: %', sqlerrm; end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '10 기간 0일' t, mall_builder_resale_set_period((select id from mall_builder_stores where slug='my-shop'), 0) <= now();
do $$ begin insert into mall_builder_orders (store_id, seq, order_no, user_id, receiver, depositor) values ((select id from mall_builder_stores where slug='my-shop'), 1, 'R-1', '00000000-0000-0000-0000-0000000000e1', '{"zip":"10228"}', '홍'); raise notice '11 만료 몰 주문 — 통과됨(문제)'; exception when others then raise notice '11 막힘: %', sqlerrm; end $$;
select '12 신청 상태' t, status, store_id is not null from mall_builder_resale_applications;
