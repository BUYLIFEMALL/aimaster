-- 0101 메시지 시나리오(로컬 Docker 전용). 운영 번들 → 0061 시나리오(본사 hq-mall, 대표 a1) → 0101 뒤 같은 시험 DB에서 psql -f. 결과 줄 앞에 M1~M10.
\set ON_ERROR_STOP 1
-- 시각 흉내: fake_hour 값을 한국 시각으로 쓴다
create table public.fake_hour (h integer);
insert into public.fake_hour values (10);
create or replace function mall_builder_private.kst_hour() returns integer language sql stable set search_path = '' as $$ select h from public.fake_hour limit 1 $$;

-- 사람: 유저 3명(u1 동의·u2 미동의·u3 동의), 직원 s1(상품 권한만)·s2(유저 권한)
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000f1','u1@x.test'),('00000000-0000-0000-0000-0000000000f2','u2@x.test'),('00000000-0000-0000-0000-0000000000f3','u3@x.test'),
 ('00000000-0000-0000-0000-0000000000f7','s1@x.test'),('00000000-0000-0000-0000-0000000000f8','s2@x.test');
insert into public.profiles (id, email) values
 ('00000000-0000-0000-0000-0000000000f1','u1@x.test'),('00000000-0000-0000-0000-0000000000f2','u2@x.test'),('00000000-0000-0000-0000-0000000000f3','u3@x.test'),
 ('00000000-0000-0000-0000-0000000000f7','s1@x.test'),('00000000-0000-0000-0000-0000000000f8','s2@x.test');
insert into mall_builder_store_customers (id, store_id, user_id, name, phone, marketing_agree) values
 ('00000000-0000-0000-0000-00000000f1f1','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f1','유저1','010-1111-0001', true),
 ('00000000-0000-0000-0000-00000000f2f2','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f2','유저2','010-1111-0002', false),
 ('00000000-0000-0000-0000-00000000f3f3','00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f3','유저3','010-1111-0003', true);
insert into mall_builder_store_staff (store_id, user_id, role, perms) values
 ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f7','staff','{"products":true}'),
 ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000f8','manager','{"customers":true}');
insert into mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, status, total, is_card, is_credit) values
 ('00000000-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-00000000005a',97,'MS-1','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-00000000f1f1',
  '{"name":"받는분1","phone":"010-1111-0001","zip":"1"}','유저1','pending_payment',22000,false,false),
 ('00000000-0000-0000-0000-0000000000e8','00000000-0000-0000-0000-00000000005a',98,'MS-2','00000000-0000-0000-0000-0000000000f3','00000000-0000-0000-0000-00000000f3f3',
  '{"name":"받는분3","phone":"010-1111-0003","zip":"1"}','유저3','pending_payment',5000,false,false);

-- M1 상품 권한만 있는 직원은 보낼 수 없음
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f7', false);
do $$ begin perform public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','sms',false,'','안녕', array['00000000-0000-0000-0000-00000000f1f1']::uuid[]); raise notice 'M1 통과됨(문제)';
exception when others then raise notice 'M1 막힘 %', sqlerrm; end $$;
-- M2 예약 실행 미연결이면 막힘(대기 줄에서 버려지지 않게)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f8', false);
do $$ begin perform public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','sms',false,'','안녕', array['00000000-0000-0000-0000-00000000f1f1']::uuid[]); raise notice 'M2 통과됨(문제)';
exception when others then raise notice 'M2 막힘 %', sqlerrm; end $$;

-- 연결: 예약 실행·솔라피·Resend·발신번호·자동 알림(발송 → 유저)
insert into mall_builder_store_schedulers (store_id, job_id, paused) values ('00000000-0000-0000-0000-00000000005a', 1, false) on conflict (store_id) do update set job_id = 1, paused = false;
insert into mall_builder_store_scheduler_secrets (store_id, solapi_api_key, solapi_api_secret, resend_api_key) values ('00000000-0000-0000-0000-00000000005a','k','s','r')
  on conflict (store_id) do update set solapi_api_key = 'k', solapi_api_secret = 's', resend_api_key = 'r';
insert into mall_builder_store_notify_settings (store_id, sender_phone, kinds, email_from) values ('00000000-0000-0000-0000-00000000005a','0212345678', array['customer_shipped'], 'shop@x.test')
  on conflict (store_id) do update set sender_phone = '0212345678', kinds = array['customer_shipped'], email_from = 'shop@x.test';

-- M3 미리보기(넣지 않음): 일반 문자 3명 → 3명, 대기 줄 0
select 'M3' t, r ->> 'targets' targets, r ->> 'will_send' will_send, (select count(*) from mall_builder_notifications where campaign_id is not null) queued
  from (select public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','sms',false,'','공지입니다',
        array['00000000-0000-0000-0000-00000000f1f1','00000000-0000-0000-0000-00000000f2f2','00000000-0000-0000-0000-00000000f3f3']::uuid[], null, true) r) x;
-- M4 광고: 수신 거부 안내 없으면 막힘 → 대표가 적음 → 밤 22시 막힘 → 오전 10시 동의자 2명만, (광고)·거부 안내 붙음
do $$ begin perform public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','sms',true,'','세일', array['00000000-0000-0000-0000-00000000f1f1']::uuid[]); raise notice 'M4a 통과됨(문제)';
exception when others then raise notice 'M4a 막힘 %', sqlerrm; end $$;
do $$ begin perform public.mall_builder_message_settings_save('00000000-0000-0000-0000-00000000005a', 1000, 3000, '무료거부 080-000-0000', '{}', '{}'); raise notice 'M10a 매니저 설정 통과됨(문제)';
exception when others then raise notice 'M10a 매니저 설정 막힘 %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select public.mall_builder_message_settings_save('00000000-0000-0000-0000-00000000005a', 1000, 3000, '무료거부 080-000-0000', array['customer_cancelled'], '{}');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f8', false);
update public.fake_hour set h = 22;
do $$ begin perform public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','sms',true,'','세일', array['00000000-0000-0000-0000-00000000f1f1']::uuid[]); raise notice 'M4b 통과됨(문제)';
exception when others then raise notice 'M4b 막힘 %', sqlerrm; end $$;
update public.fake_hour set h = 10;
create temp table m4 as select public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','sms',true,'','주말 세일',
        array['00000000-0000-0000-0000-00000000f1f1','00000000-0000-0000-0000-00000000f2f2','00000000-0000-0000-0000-00000000f3f3']::uuid[]) r;
select 'M4c' t, r ->> 'will_send' will_send, r ->> 'no_agree' no_agree,
  (select string_agg(to_phone, ',' order by to_phone) from mall_builder_notifications where campaign_id = (r ->> 'campaign_id')::uuid) phones,
  (select replace(body, E'
', ' / ') from mall_builder_notifications where campaign_id = (r ->> 'campaign_id')::uuid limit 1) body
  from m4;
-- M5 상한: 한 번 1명으로 낮추면 2명 막힘, 하루 3명으로 낮추면(오늘 2명 보냄) 2명 더 막힘
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select public.mall_builder_message_settings_save('00000000-0000-0000-0000-00000000005a', 1, 3000, '무료거부 080-000-0000', array['customer_cancelled'], '{}');
do $$ begin perform public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','email',false,'제목','본문', array['00000000-0000-0000-0000-00000000f1f1','00000000-0000-0000-0000-00000000f3f3']::uuid[]); raise notice 'M5a 통과됨(문제)';
exception when others then raise notice 'M5a 막힘 %', sqlerrm; end $$;
select public.mall_builder_message_settings_save('00000000-0000-0000-0000-00000000005a', 1000, 3, '무료거부 080-000-0000', array['customer_cancelled'], '{}');
do $$ begin perform public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','email',false,'제목','본문', array['00000000-0000-0000-0000-00000000f1f1','00000000-0000-0000-0000-00000000f3f3']::uuid[]); raise notice 'M5b 통과됨(문제)';
exception when others then raise notice 'M5b 막힘 %', sqlerrm; end $$;
select public.mall_builder_message_settings_save('00000000-0000-0000-0000-00000000005a', 1000, 3000, '무료거부 080-000-0000', array['customer_cancelled'], '{}');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f8', false);
-- M6 주문 화면 개별 메일: 주문자 메일로 1통, 대기 줄 order_id 비움(주문 알림 중복 막기와 안 부딪힘), 두 번 보내도 됨 / 주문 화면 광고 막힘
create temp table m6 as select public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','email',false,'배송 안내','곧 보냅니다', '{}', '00000000-0000-0000-0000-0000000000e7') r;
insert into m6 select public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','email',false,'배송 안내2','내일 보냅니다', '{}', '00000000-0000-0000-0000-0000000000e7');
select 'M6' t, (select string_agg(r ->> 'will_send', ',') from m6) sent,
  (select string_agg(n.to_email || ':' || coalesce(n.order_id::text, '없음') || ':' || n.subject, ' | ') from mall_builder_notifications n where n.campaign_id in (select (r ->> 'campaign_id')::uuid from m6)) rows,
  (select count(*) from mall_builder_campaigns c where c.order_id = '00000000-0000-0000-0000-0000000000e7') camp;
do $$ begin perform public.mall_builder_message_send('00000000-0000-0000-0000-00000000005a','sms',true,'','세일', '{}', '00000000-0000-0000-0000-0000000000e7'); raise notice 'M6b 통과됨(문제)';
exception when others then raise notice 'M6b 막힘 %', sqlerrm; end $$;
-- M7 문구 편집: 매니저는 못 바꿈, 대표가 「발송 → 유저」 문구 저장 → 발송 처리 때 치환된 문구로 들어감
do $$ begin perform public.mall_builder_notify_template_save('00000000-0000-0000-0000-00000000005a','customer_shipped','sms','','x'); raise notice 'M10b 매니저 문구 통과됨(문제)';
exception when others then raise notice 'M10b 매니저 문구 막힘 %', sqlerrm; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select public.mall_builder_notify_template_save('00000000-0000-0000-0000-00000000005a','customer_shipped','sms','','{받는분}님, {주문번호} 출발! {택배사} {송장번호} ({금액})');
select public.mall_builder_change_order_status('00000000-0000-0000-0000-0000000000e7', 'paid', '', '', '');
select public.mall_builder_change_order_status('00000000-0000-0000-0000-0000000000e7', 'preparing', '', '', '');
select public.mall_builder_change_order_status('00000000-0000-0000-0000-0000000000e7', 'shipping', '', 'CJ대한통운', '123456789');
select 'M7' t, body from mall_builder_notifications where order_id = '00000000-0000-0000-0000-0000000000e7' and kind = 'customer_shipped';
-- M8 새 알림: 운영사가 주문 취소 → 「주문 취소 → 유저」 문자(켜 둔 extra_kinds)
select public.mall_builder_change_order_status('00000000-0000-0000-0000-0000000000e8', 'cancelled', '품절', '', '');
select 'M8' t, kind, to_phone, body from mall_builder_notifications where order_id = '00000000-0000-0000-0000-0000000000e8' and kind like '%cancelled%';
-- M9 빈 문구 저장 = 기본 문구로 되돌림
select public.mall_builder_notify_template_save('00000000-0000-0000-0000-00000000005a','customer_shipped','sms','','');
select 'M9' t, count(*) left_templates from mall_builder_notify_templates where store_id = '00000000-0000-0000-0000-00000000005a';
-- M11 비로그인(anon)은 새 공개 함수 3개를 실행할 수 없음(Supabase 기본 권한으로 anon이 따로 받는 것까지 거둠) → 기대 0
select 'M11' t, count(*) anon_exec from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('mall_builder_message_send','mall_builder_message_settings_save','mall_builder_notify_template_save')
   and has_function_privilege('anon', p.oid, 'execute');
-- M12 조건 없는 delete 금지(Supabase safeupdate가 실행 중에 막음 — 로컬 DB엔 없어서 함수 본문으로 검사) → 기대 0
select 'M12' t, count(*) no_where_delete from (
  select (regexp_matches(p.prosrc, 'delete\s+from\s+[^;]+;', 'gi'))[1] s
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'mall_builder_private') and p.proname like '%mall_builder%' or (n.nspname = 'mall_builder_private')
) x where s !~* '\mwhere\M';
