-- Lab 0102 적용·시험 자료 확인(읽기 전용) — apply.sql·fixture.sql 뒤. 마지막 줄 「전체」가 OK면 성공
-- 엄격 판정(QA msg_3f0dc30e1075): 값이 비면(NULL) 「(없음)」으로 바꿔 불일치로 센다. 「전체」는 줄 수가 정확히 13이고 13개 모두 일치할 때만 OK
-- (예전 식 bool_and(기대 = 실제)는 NULL 줄을 건너뛰어 12개 일치 + 1개 NULL도 OK가 될 수 있었음)
with chk as (
  select 1 o, '교환 표 있음·RLS 켜짐' 항목, 'true' 기대, (select relrowsecurity from pg_class where oid = to_regclass('public.mall_builder_exchanges'))::text 실제
  union all select 2, '공개 함수 4개', '4', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('mall_builder_request_exchange','mall_builder_exchange_step','mall_builder_exchange_fee','mall_builder_exchange_fee_paid'))::text
  union all select 3, '로그인 회원 실행 가능 4개', '4', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('mall_builder_request_exchange','mall_builder_exchange_step','mall_builder_exchange_fee','mall_builder_exchange_fee_paid') and has_function_privilege('authenticated', p.oid, 'execute'))::text
  union all select 4, '비로그인 실행 가능 0개', '0', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('mall_builder_request_exchange','mall_builder_exchange_step','mall_builder_exchange_fee','mall_builder_exchange_fee_paid') and has_function_privilege('anon', p.oid, 'execute'))::text
  union all select 5, '내부 함수 7개(로그인 회원 실행 불가)', '7', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'mall_builder_private' and p.proname in ('delivered_at','variant_label','exchange_event','exchange_stock','lock_exchange','exchange_order_delivered','orders_exchange_guard') and not has_function_privilege('authenticated', p.oid, 'execute'))::text
  union all select 6, '주문 상태 지킴 트리거', '1', (select count(*) from pg_trigger where tgname = 'mall_builder_orders_exchange_guard' and not tgisinternal)::text
  union all select 7, '로그인 회원 직접 쓰기 권한 없음', 'false', (has_table_privilege('authenticated', 'public.mall_builder_exchanges', 'insert') or has_table_privilege('authenticated', 'public.mall_builder_exchanges', 'update') or has_table_privilege('authenticated', 'public.mall_builder_exchanges', 'delete'))::text
  union all select 8, '0102 적용 기록 1줄', '1', (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges')::text
  union all select 9, '시험 주문 2건·소유자 시험 회원·배송 완료', '2', (select count(*) from public.mall_builder_orders where id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032') and user_id = '6fbce7f8-b54e-462e-8e4b-4391b2603f65' and status = 'delivered')::text
  union all select 10, '시험 재고 S5·M5·L0·머그 10', '5/5/0/10', (select string_agg(stock::text, '/' order by sort) from public.mall_builder_product_variants where product_id = 'e0102000-0000-4000-8000-000000000011') || '/' || (select stock from public.mall_builder_products where id = 'e0102000-0000-4000-8000-000000000012')
  union all select 11, '교환 0건(시작 상태)', '0', (select count(*) from public.mall_builder_exchanges)::text
  union all select 12, '시험 주문 알림 0건', '0', (select count(*) from public.mall_builder_notifications where order_id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032'))::text
  union all select 13, '시험 상품 2개 판매 중·사업자 전용·승인', '2', (select count(*) from public.mall_builder_products where id in ('e0102000-0000-4000-8000-000000000011','e0102000-0000-4000-8000-000000000012') and status = 'on_sale' and visibility = 'business_only' and approval = 'approved')::text
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 14, '전체', '13/13', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 13 and (select count(*) filter (where 기대 = 실제) from j) = 13 then 'OK' else '확인 필요' end
order by 1;
