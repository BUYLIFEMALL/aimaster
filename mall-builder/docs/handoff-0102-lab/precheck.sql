-- Lab 0102 실행 전 확인(읽기 전용) — 대상: Lab(AIMaster_dev, ref rjjtjakljjxsgjelqgek). 모든 줄이 OK여야 apply.sql → fixture.sql
with s as (select id, owner_id from public.mall_builder_stores where slug = 'aimaster-b2b')
select 1 순서, '몰 aimaster-b2b 있음' 항목, case when exists (select 1 from s) then 'OK' else '멈춤' end 판정
union all select 2, '시험 회원(6fbce7f8…) 있음·이 몰 유저', case when exists (select 1 from public.mall_builder_store_customers c join s on c.store_id = s.id where c.user_id = '6fbce7f8-b54e-462e-8e4b-4391b2603f65') then 'OK' else '멈춤' end
union all select 3, '시험 회원이 몰 주인 아님(유저 화면 시험용)', case when not exists (select 1 from s where owner_id = '6fbce7f8-b54e-462e-8e4b-4391b2603f65') then 'OK' else '멈춤' end
union all select 4, '0101 적용 기록 있음', case when exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0101_messaging') then 'OK' else '멈춤' end
union all select 5, '0102 미적용(표·기록 없음)', case when to_regclass('public.mall_builder_exchanges') is null and not exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') then 'OK' else '멈춤(이미 있음)' end
union all select 6, '선행 칸 exchange_fee·cancelled_qty 있음', case when (select count(*) from information_schema.columns where table_schema = 'public' and ((table_name = 'mall_builder_shipping_policies' and column_name = 'exchange_fee') or (table_name = 'mall_builder_order_items' and column_name = 'cancelled_qty'))) = 2 then 'OK' else '멈춤' end
union all select 7, '선행 함수 mall_builder_staff_can 있음', case when exists (select 1 from pg_proc where proname = 'mall_builder_staff_can') then 'OK' else '멈춤' end
union all select 8, '시험 자료 번호 비어 있음(EXQA-·seq 900001~2·고정 id)', case when not exists (select 1 from public.mall_builder_orders o join s on o.store_id = s.id where o.order_no like 'EXQA-%' or o.seq in (900001, 900002))
  and not exists (select 1 from public.mall_builder_products where id in ('e0102000-0000-4000-8000-000000000011','e0102000-0000-4000-8000-000000000012'))
  and not exists (select 1 from public.mall_builder_shipping_policies where id = 'e0102000-0000-4000-8000-000000000001') then 'OK' else '멈춤' end
order by 1;
