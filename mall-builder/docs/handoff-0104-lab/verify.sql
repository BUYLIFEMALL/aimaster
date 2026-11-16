-- Lab 0104 적용 확인(읽기 전용) — apply.sql 뒤. 마지막 줄 「전체」가 OK면 성공
-- 엄격 판정: 값이 비면(NULL) 「(없음)」으로 바꿔 불일치로 센다. 「전체」는 줄 수가 정확히 16이고 16개 모두 일치할 때만 OK.
-- 결제 기록·시도 이력은 0줄이어야 한다(적용은 정의만, 실제 결제·시험 자료 0). 기존 자료(주문·알림·장부·리워드·시험 교환)는 precheck와 같아야 한다.
with chk as (
  select 1 o, '0104 적용 기록 1줄' 항목, '1' 기대, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0104_exchange_fee_payments')::text 실제
  union all select 2, '0102·0103 기록 각 1줄(그대로)', '1/1',
    (select count(*) filter (where name = 'mall_builder_0102_exchanges') || '/' || count(*) filter (where name = 'mall_builder_0103_exchange_confirmed_window') from supabase_migrations.schema_migrations)
  union all select 3, '표 2개 있음·보안 규칙(RLS) 켜짐', 'true/true/true/true',
    concat_ws('/', (to_regclass('public.mall_builder_exchange_fee_payments') is not null)::text, (to_regclass('public.mall_builder_exchange_fee_payment_attempts') is not null)::text,
      (select relrowsecurity::text from pg_class where oid = to_regclass('public.mall_builder_exchange_fee_payments')),
      (select relrowsecurity::text from pg_class where oid = to_regclass('public.mall_builder_exchange_fee_payment_attempts')))
  union all select 4, '결제 기록 0줄·시도 이력 0줄(새 자료 0)', '0/0',
    (select count(*) from public.mall_builder_exchange_fee_payments) || '/' || (select count(*) from public.mall_builder_exchange_fee_payment_attempts)
  union all select 5, '결제 기록 칸 권한: 로그인 회원은 상태 읽기 가능, 결제 키·멱등키 읽기 불가, 비로그인 0', 'true/false/false/false',
    concat_ws('/', has_column_privilege('authenticated', 'public.mall_builder_exchange_fee_payments', 'status', 'select')::text,
      has_column_privilege('authenticated', 'public.mall_builder_exchange_fee_payments', 'payment_key', 'select')::text,
      has_column_privilege('authenticated', 'public.mall_builder_exchange_fee_payments', 'idempotency_key', 'select')::text,
      has_table_privilege('anon', 'public.mall_builder_exchange_fee_payments', 'select')::text)
  union all select 6, '결제 기록 쓰기 권한 0(로그인 회원 insert·update·delete)', 'false/false/false',
    concat_ws('/', has_table_privilege('authenticated', 'public.mall_builder_exchange_fee_payments', 'insert')::text,
      has_table_privilege('authenticated', 'public.mall_builder_exchange_fee_payments', 'update')::text,
      has_table_privilege('authenticated', 'public.mall_builder_exchange_fee_payments', 'delete')::text)
  union all select 7, '시도 이력 권한 0(로그인 회원·비로그인 읽기 0, 정책 0)', 'false/false/0',
    concat_ws('/', has_table_privilege('authenticated', 'public.mall_builder_exchange_fee_payment_attempts', 'select')::text,
      has_table_privilege('anon', 'public.mall_builder_exchange_fee_payment_attempts', 'select')::text,
      (select count(*) from pg_policy where polrelid = to_regclass('public.mall_builder_exchange_fee_payment_attempts'))::text)
  union all select 8, '공개 함수 3개 실행 권한: 로그인 회원 있음·비로그인 없음(prepare/confirm/recheck)', 'true/false/true/false/true/false',
    concat_ws('/', has_function_privilege('authenticated', 'public.mall_builder_exchange_fee_card_prepare(uuid,text,bigint)', 'execute')::text,
      has_function_privilege('anon', 'public.mall_builder_exchange_fee_card_prepare(uuid,text,bigint)', 'execute')::text,
      has_function_privilege('authenticated', 'public.mall_builder_exchange_fee_card_confirm(uuid,text)', 'execute')::text,
      has_function_privilege('anon', 'public.mall_builder_exchange_fee_card_confirm(uuid,text)', 'execute')::text,
      has_function_privilege('authenticated', 'public.mall_builder_exchange_fee_card_recheck(uuid)', 'execute')::text,
      has_function_privilege('anon', 'public.mall_builder_exchange_fee_card_recheck(uuid)', 'execute')::text)
  union all select 9, '공개 함수 3개 = 소유자 권한·search_path 빈 값', '3',
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
      and p.proname in ('mall_builder_exchange_fee_card_prepare', 'mall_builder_exchange_fee_card_confirm', 'mall_builder_exchange_fee_card_recheck')
      and p.prosecdef and p.proconfig @> array['search_path=""'])::text
  union all select 10, '내부 함수 4개 로그인 회원 실행 권한 0', '0',
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'mall_builder_private'
      and p.proname in ('exchange_fee_attempt_archive', 'exchanges_fee_card_guard', 'exchange_fee_mark_card_paid', 'exchange_fee_card_hold_canceled')
      and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute')))::text
  union all select 11, '내부 함수 4개 있음·교환 표 지킴 트리거 1개', '4/1',
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'mall_builder_private'
      and p.proname in ('exchange_fee_attempt_archive', 'exchanges_fee_card_guard', 'exchange_fee_mark_card_paid', 'exchange_fee_card_hold_canceled')) || '/'
    || (select count(*) from pg_trigger where tgrelid = 'public.mall_builder_exchanges'::regclass and tgname = 'mall_builder_exchanges_fee_card_guard' and not tgisinternal)
  union all select 12, '교환 1행 그대로 = 시험 교환 rejected·교환비 없음', '1/rejected:none:0',
    (select count(*) || '/' || coalesce(string_agg(step || ':' || fee_status || ':' || fee, ','), '') from public.mall_builder_exchanges)
  union all select 13, '시험 아닌 주문 17/1·지문 그대로(precheck 17번)', '17/1/c56e3560d4f9b4d98c724cbfc93ed228',
    (select count(*) filter (where s.slug = 'aimaster-b2b') || '/' || count(*) filter (where s.slug = 'card-test-resale')
       from public.mall_builder_orders o join public.mall_builder_stores s on s.id = o.store_id where o.id::text not like 'e0102000%') || '/'
    || (select md5(string_agg(o.id || ':' || o.status || ':' || o.updated_at, ',' order by o.id)) from public.mall_builder_orders o where o.id::text not like 'e0102000%')
  union all select 14, '알림 44건', '44', (select count(*) from public.mall_builder_notifications)::text
  union all select 15, '시험 주문 EXQA-1 delivered·EXQA-2 confirmed', 'delivered/confirmed',
    (select string_agg(status, '/' order by id) from public.mall_builder_orders where id in ('e0102000-0000-4000-8000-000000000031', 'e0102000-0000-4000-8000-000000000032'))
  union all select 16, '리셀러 장부 500 1줄 · 리워드 paid 500·pending 2300', '7203b416-e791-487c-8708-36e9503493e8:500 | paid:500,pending:2300',
    (select coalesce(string_agg(id || ':' || amount, ',' order by created_at), '없음') from public.mall_builder_reseller_ledger) || ' | '
    || (select coalesce(string_agg(status || ':' || amount, ',' order by amount), '없음') from public.mall_builder_reseller_rewards)
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 17, '전체', '16/16', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 16 and (select count(*) filter (where 기대 = 실제) from j) = 16 then 'OK' else '확인 필요' end
union all select 18, '기록: 교환 행 지문(precheck 18번과 같아야)', '-',
  (select md5(coalesce(string_agg(id || ':' || step || ':' || fee_status || ':' || updated_at, ',' order by id), '')) from public.mall_builder_exchanges), '비교'
order by 1;
