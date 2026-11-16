-- Lab 0103 실행 전 확인(읽기 전용) — 1~10번이 모두 OK일 때만 apply.sql. 11·12번은 기준값 기록(verify와 비교용, 판정 없음)
-- 기준값 출처: 2026-11-17 04:13(KST) Lab 읽기 — aimaster-b2b 시험 아닌 주문 17·card-test-resale 1, 알림 44, 리셀러 장부 7203b416…(EXQA-2 500) 1줄
with chk as (
  select 1 o, 'Lab 몰 aimaster-b2b 있음' 항목, '1' 기대, (select count(*) from public.mall_builder_stores where slug = 'aimaster-b2b')::text 실제
  union all select 2, '0102 적용 기록 1줄', '1', (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges')::text
  union all select 3, '0103 적용 기록 없음', '0', (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window')::text
  union all select 4, '0103 도우미 함수 없음', 'true', (to_regprocedure('mall_builder_private.exchange_order_status_ok(text)') is null)::text
  union all select 5, '교환 표 있음', 'true', (to_regclass('public.mall_builder_exchanges') is not null)::text
  union all select 6, '주문 상태 지킴 트리거 1개', '1', (select count(*) from pg_trigger where tgname = 'mall_builder_orders_exchange_guard' and not tgisinternal)::text
  union all select 7, '지금 지킴 함수 = 0102판(교환 진행 중 delivered→confirmed 막음)', 'true',
    (select p.prosrc not like '%exchange_order_status_ok%' and p.prosrc like '%delivered%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'mall_builder_private' and p.proname = 'orders_exchange_guard')::text
  union all select 8, '진행 중 교환 0건(있으면 다음 자동 확정 회차 전체 실패 위험 — 먼저 알림)', '0',
    (select count(*) from public.mall_builder_exchanges where step in ('requested', 'collecting', 'collected', 'reshipped'))::text
  union all select 9, '시험 아닌 주문 aimaster-b2b 17·card-test-resale 1', '17/1',
    (select count(*) filter (where s.slug = 'aimaster-b2b') || '/' || count(*) filter (where s.slug = 'card-test-resale')
       from public.mall_builder_orders o join public.mall_builder_stores s on s.id = o.store_id where o.id::text not like 'e0102000%')
  union all select 10, '알림 44건', '44', (select count(*) from public.mall_builder_notifications)::text
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 11, '기준값: 시험 아닌 주문 지문(id·상태·수정 시각 md5)', '-',
  (select md5(string_agg(o.id || ':' || o.status || ':' || o.updated_at, ',' order by o.id)) from public.mall_builder_orders o where o.id::text not like 'e0102000%'), '기록'
union all select 12, '기준값: 리셀러 장부·리워드(id:주문:금액)', '-',
  (select coalesce(string_agg(l.id || ':' || coalesce(l.order_id::text, '-') || ':' || l.amount, ',' order by l.created_at), '없음') from public.mall_builder_reseller_ledger l)
  || ' | ' || (select coalesce(string_agg(w.id || ':' || w.status || ':' || w.amount, ',' order by w.created_at), '없음') from public.mall_builder_reseller_rewards w), '기록'
order by 1;
