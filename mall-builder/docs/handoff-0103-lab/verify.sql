-- Lab 0103 적용 확인(읽기 전용) — apply.sql 뒤. 마지막 줄 「전체」가 OK면 성공
-- 엄격 판정: 값이 비면(NULL) 「(없음)」으로 바꿔 불일치로 센다. 「전체」는 줄 수가 정확히 14이고 14개 모두 일치할 때만 OK
-- 10번(시험 주문 상태)은 0102 verify 9번(배송 완료만)을 대체 — 자동 구매 확정이 정상 동작해 EXQA-2가 confirmed가 된 것이므로 기대를 「교환 가능 상태」로 바꾼 이유가 이것
-- 13번(리셀러 장부)은 EXQA-1이 11-18 03:31(KST) 이후 자동 확정되면 1,400원 줄이 정상으로 더해짐 — 두 경우 모두 manifest와 정확히 같아야 OK
with chk as (
  select 1 o, '0103 적용 기록 1줄' 항목, '1' 기대, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window')::text 실제
  union all select 2, '0102 적용 기록 1줄(그대로)', '1', (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges')::text
  union all select 3, '도우미: delivered·confirmed만 교환 가능', 'true/true/false/false/false',
    (select concat_ws('/', mall_builder_private.exchange_order_status_ok('delivered')::text, mall_builder_private.exchange_order_status_ok('confirmed')::text,
       mall_builder_private.exchange_order_status_ok('shipping')::text, mall_builder_private.exchange_order_status_ok('returned')::text,
       coalesce(mall_builder_private.exchange_order_status_ok(null), false)::text))
  union all select 4, '도우미 실행 권한: 로그인 회원·비로그인 모두 없음', 'false/false',
    (select has_function_privilege('authenticated', 'mall_builder_private.exchange_order_status_ok(text)', 'execute') || '/'
         || has_function_privilege('anon', 'mall_builder_private.exchange_order_status_ok(text)', 'execute'))
  union all select 5, '진행 단계 상태 확인이 도우미 사용', 'true',
    (select p.prosrc like '%exchange_order_status_ok%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'mall_builder_private' and p.proname = 'exchange_order_delivered')::text
  union all select 6, '교환 신청: 도우미 사용 + 실제 배송 뒤 7일(D4) 그대로', 'true',
    (select p.prosrc like '%exchange_order_status_ok%' and p.prosrc like '%delivered_at(o.id)%' and p.prosrc like '%interval ''7 days''%'
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'mall_builder_request_exchange')::text
  union all select 7, '교환 신청 권한: 로그인 회원 있음·비로그인 없음', 'true/false',
    (select has_function_privilege('authenticated', 'public.mall_builder_request_exchange(uuid, integer, uuid, text, text)', 'execute') || '/'
         || has_function_privilege('anon', 'public.mall_builder_request_exchange(uuid, integer, uuid, text, text)', 'execute'))
  union all select 8, '지킴: 새 판(교환 가능 상태 밖 전이만 막음)·트리거 1개', 'true/1',
    (select (p.prosrc like '%exchange_order_status_ok(new.status)%')::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'mall_builder_private' and p.proname = 'orders_exchange_guard') || '/'
    || (select count(*) from pg_trigger where tgname = 'mall_builder_orders_exchange_guard' and not tgisinternal)
  union all select 9, '교환 0건(적용은 함수만 바꿈)', '0', (select count(*) from public.mall_builder_exchanges)::text
  union all select 10, '시험 주문 2건·소유자 시험 회원·교환 가능 상태(delivered·confirmed)', '2',
    (select count(*) from public.mall_builder_orders where id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032')
      and user_id = '6fbce7f8-b54e-462e-8e4b-4391b2603f65' and status in ('delivered', 'confirmed'))::text
  union all select 11, '시험 아닌 주문 aimaster-b2b 17·card-test-resale 1', '17/1',
    (select count(*) filter (where s.slug = 'aimaster-b2b') || '/' || count(*) filter (where s.slug = 'card-test-resale')
       from public.mall_builder_orders o join public.mall_builder_stores s on s.id = o.store_id where o.id::text not like 'e0102000%')
  union all select 12, '알림 44건', '44', (select count(*) from public.mall_builder_notifications)::text
  union all select 13, '리셀러 장부 = manifest(EXQA-2 500 [+ 자동 확정 뒤 EXQA-1 1,400])', 'true',
    (select (string_agg(coalesce(l.order_id::text, '-') || ':' || l.amount, ',' order by l.order_id) in
              ('e0102000-0000-4000-8000-000000000032:500',
               'e0102000-0000-4000-8000-000000000031:1400,e0102000-0000-4000-8000-000000000032:500'))
            and bool_or(l.id = '7203b416-e791-487c-8708-36e9503493e8')
       from public.mall_builder_reseller_ledger l)::text
  union all select 14, '자동 확정 예약 켜짐(멈춤 아님·예약 번호 있음)', 'false/true',
    (select s.paused || '/' || (s.job_id is not null) from public.mall_builder_store_schedulers s join public.mall_builder_stores t on t.id = s.store_id where t.slug = 'aimaster-b2b')
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 15, '전체', '14/14', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 14 and (select count(*) filter (where 기대 = 실제) from j) = 14 then 'OK' else '확인 필요' end
union all select 16, '기록: 시험 아닌 주문 지문(precheck 11번과 같아야)', '-',
  (select md5(string_agg(o.id || ':' || o.status || ':' || o.updated_at, ',' order by o.id)) from public.mall_builder_orders o where o.id::text not like 'e0102000%'), '비교'
order by 1;
