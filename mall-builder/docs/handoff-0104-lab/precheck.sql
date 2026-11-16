-- Lab 0104 실행 전 확인(읽기 전용) — 1~16번이 모두 OK일 때만 apply.sql. 17·18번은 기준값 기록(verify와 비교용, 판정 없음)
-- 대상: Lab(AIMaster_dev, ref rjjtjakljjxsgjelqgek). 운영(esgxyik…)에서 실행 금지 — 1번이 OK여도 SQL 편집기 화면의 프로젝트 이름을 먼저 눈으로 확인.
-- 기준값 출처: 2026-11-17 Lab 읽기(0103 적용·직원 RPC 시험 뒤) — 교환 1행 rejected·교환비 0, 시험 아닌 주문 17/1·지문 c56e3560…, 알림 44,
--   리셀러 장부 7203b416…:500 1줄, 리워드 paid 500·pending 2300, 시험 주문 EXQA-1 delivered·EXQA-2 confirmed.
--   EXQA-1은 11-18 03:31(KST) 이후 자동 구매 확정될 수 있다 — 그러면 15번이 어긋나므로 멈추고 Master에 새 기준값을 받는다.
-- 이 파일은 키·회원 원문을 읽지 않는다(토스 키 칸은 「칸이 있는가」만 본다).
with chk as (
  select 1 o, 'Lab 몰 aimaster-b2b 있음' 항목, '1' 기대, (select count(*) from public.mall_builder_stores where slug = 'aimaster-b2b')::text 실제
  union all select 2, '0102·0103 적용 기록 각 1줄', '1/1',
    (select count(*) filter (where name = 'mall_builder_0102_exchanges') || '/' || count(*) filter (where name = 'mall_builder_0103_exchange_confirmed_window') from supabase_migrations.schema_migrations)
  union all select 3, '0104 적용 기록 없음', '0', (select count(*) from supabase_migrations.schema_migrations where name like 'mall_builder_0104%')::text
  union all select 4, '0104 표 2개 없음', 'true/true',
    ((to_regclass('public.mall_builder_exchange_fee_payments') is null) || '/' || (to_regclass('public.mall_builder_exchange_fee_payment_attempts') is null))
  union all select 5, '0104 함수 7개·지킴 트리거 없음(부분 적용 0)', '0/0',
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where (n.nspname = 'public' and p.proname in ('mall_builder_exchange_fee_card_prepare', 'mall_builder_exchange_fee_card_confirm', 'mall_builder_exchange_fee_card_recheck'))
         or (n.nspname = 'mall_builder_private' and p.proname in ('exchange_fee_attempt_archive', 'exchanges_fee_card_guard', 'exchange_fee_mark_card_paid', 'exchange_fee_card_hold_canceled'))) || '/'
    || (select count(*) from pg_trigger where tgname = 'mall_builder_exchanges_fee_card_guard' and not tgisinternal)
  union all select 6, '교환 표·교환비 칸 4개', 'true/4',
    ((to_regclass('public.mall_builder_exchanges') is not null) || '/' || (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'mall_builder_exchanges' and column_name in ('fee', 'fee_status', 'fee_paid_at', 'updated_at')))
  union all select 7, '선행 함수 toss_call·exchange_event·lock_exchange·exchange_order_status_ok·staff_can', 'true/true/true/true/true',
    concat_ws('/', (to_regprocedure('mall_builder_private.toss_call(text,text,text,jsonb,text)') is not null)::text,
      (to_regprocedure('mall_builder_private.exchange_event(uuid,text,text)') is not null)::text,
      (to_regprocedure('mall_builder_private.lock_exchange(uuid)') is not null)::text,
      (to_regprocedure('mall_builder_private.exchange_order_status_ok(text)') is not null)::text,
      (to_regprocedure('public.mall_builder_staff_can(uuid,text)') is not null)::text)
  union all select 8, '토스 비밀 키 칸 있음(값은 읽지 않음)', '1',
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'mall_builder_store_scheduler_secrets' and column_name = 'toss_secret_key')::text
  union all select 9, 'http 확장 있음', '1', (select count(*) from pg_extension where extname = 'http')::text
  union all select 10, 'DB 시간대 UTC(적용 기록 version은 UTC로 씀)', 'UTC', current_setting('TimeZone')
  union all select 11, '교환 1행 = 시험 교환 rejected·교환비 없음', '1/rejected:none:0',
    (select count(*) || '/' || coalesce(string_agg(step || ':' || fee_status || ':' || fee, ','), '') from public.mall_builder_exchanges)
  union all select 12, '교환 표 기존 트리거 0(0104가 1개 더함)', '0', (select count(*) from pg_trigger where tgrelid = 'public.mall_builder_exchanges'::regclass and not tgisinternal)::text
  union all select 13, '시험 아닌 주문 aimaster-b2b 17·card-test-resale 1', '17/1',
    (select count(*) filter (where s.slug = 'aimaster-b2b') || '/' || count(*) filter (where s.slug = 'card-test-resale')
       from public.mall_builder_orders o join public.mall_builder_stores s on s.id = o.store_id where o.id::text not like 'e0102000%')
  union all select 14, '알림 44건', '44', (select count(*) from public.mall_builder_notifications)::text
  union all select 15, '시험 주문 EXQA-1 delivered·EXQA-2 confirmed', 'delivered/confirmed',
    (select string_agg(status, '/' order by id) from public.mall_builder_orders where id in ('e0102000-0000-4000-8000-000000000031', 'e0102000-0000-4000-8000-000000000032'))
  union all select 16, '리셀러 장부 500 1줄 · 리워드 paid 500·pending 2300', '7203b416-e791-487c-8708-36e9503493e8:500 | paid:500,pending:2300',
    (select coalesce(string_agg(id || ':' || amount, ',' order by created_at), '없음') from public.mall_builder_reseller_ledger) || ' | '
    || (select coalesce(string_agg(status || ':' || amount, ',' order by amount), '없음') from public.mall_builder_reseller_rewards)
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 17, '기준값: 시험 아닌 주문 지문(id·상태·수정 시각 md5, 2026-11-17 값 c56e3560d4f9b4d98c724cbfc93ed228)', '-',
  (select md5(string_agg(o.id || ':' || o.status || ':' || o.updated_at, ',' order by o.id)) from public.mall_builder_orders o where o.id::text not like 'e0102000%'), '기록'
union all select 18, '기준값: 교환 행 지문(id·단계·교환비 상태·수정 시각)', '-',
  (select md5(coalesce(string_agg(id || ':' || step || ':' || fee_status || ':' || updated_at, ',' order by id), '')) from public.mall_builder_exchanges), '기록'
order by 1;
