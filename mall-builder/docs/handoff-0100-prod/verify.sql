-- 실행 뒤 확인(읽기 전용) — 운영 프로젝트(ref esgxyikcnnvmlhygjkth) SQL 편집기. 마지막 줄 「전체」의 판정이 OK면 성공
with chk as (
  select 1 o, 'cash_receipt 칸' 항목, '1' 기대, (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'mall_builder_orders' and column_name = 'cash_receipt')::text 실제
  union all select 2, '공개 함수 4개', '4', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
      and p.proname in ('mall_builder_cash_receipt_settings_save', 'mall_builder_cash_receipt_request', 'mall_builder_cash_receipt_recheck', 'mall_builder_cash_receipt_staff'))::text
  union all select 3, '내부 함수 6개', '6', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'mall_builder_private'
      and p.proname in ('cash_receipt_amount', 'cash_receipt_target', 'cash_receipt_issue', 'cash_receipt_cancel', 'orders_cash_receipt_auto', 'orders_receipt_one_kind'))::text
  union all select 4, '주문 표 트리거 2개', '2', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relname = 'mall_builder_orders' and not t.tgisinternal
      and t.tgname in ('mall_builder_orders_cash_receipt_auto', 'mall_builder_orders_receipt_one_kind'))::text
  union all select 5, '로그인 유저(authenticated) 실행 가능 4개', '4', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
      and p.proname like 'mall_builder_cash_receipt_%' and has_function_privilege('authenticated', p.oid, 'execute'))::text
  union all select 6, '비로그인(anon) 실행 가능 0개', '0', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
      and p.proname like 'mall_builder_cash_receipt_%' and has_function_privilege('anon', p.oid, 'execute'))::text
  union all select 7, '내부 발급·취소 함수를 유저가 직접 실행 0개', '0', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'mall_builder_private'
      and p.proname in ('cash_receipt_amount', 'cash_receipt_target', 'cash_receipt_issue', 'cash_receipt_cancel')
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')))::text
  union all select 8, '0100 적용 기록 1줄', '1', (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0100_cash_receipts')::text
  union all select 9, '0101(메시지)이 섞이지 않음', '0', (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('mall_builder_campaigns', 'mall_builder_notify_templates'))::text
)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from chk
union all select 10, '전체', '9/9', (select count(*) from chk where 기대 = 실제)::text || '/9', case when (select bool_and(기대 = 실제) from chk) then 'OK' else '확인 필요' end
order by 1;
