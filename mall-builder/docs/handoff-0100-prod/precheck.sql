-- 실행 전 확인(읽기 전용) — 운영 프로젝트(ref esgxyikcnnvmlhygjkth) SQL 편집기. 7줄 모두 판정이 OK여야 apply.sql 실행
select 1 순서, '0099 적용 기록 있음' 항목, case when exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0099_returns_refunds') then 'OK' else '멈춤' end 판정
union all select 2, '0100 적용 기록 없음', case when not exists (select 1 from supabase_migrations.schema_migrations where name like 'mall_builder_0100%') then 'OK' else '멈춤(이미 있음)' end
union all select 3, '주문 표에 cash_receipt 칸 없음', case when not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mall_builder_orders' and column_name = 'cash_receipt') then 'OK' else '멈춤(이미 있음)' end
union all select 4, '선행 함수 bolta_call 있음', case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'mall_builder_private' and p.proname = 'bolta_call') then 'OK' else '멈춤' end
union all select 5, '선행 함수 tax_invoice_lines 있음', case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'mall_builder_private' and p.proname = 'tax_invoice_lines') then 'OK' else '멈춤' end
union all select 6, '선행 함수 mall_builder_staff_can 있음', case when exists (select 1 from pg_proc where proname = 'mall_builder_staff_can') then 'OK' else '멈춤' end
union all select 7, '선행 칸 refund_status·refund_amount 있음(0099)', case when (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'mall_builder_orders' and column_name in ('refund_status', 'refund_amount')) = 2 then 'OK' else '멈춤' end
order by 1;
