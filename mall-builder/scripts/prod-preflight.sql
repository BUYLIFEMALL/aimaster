-- T0 운영 DB 사전 점검(읽기만, 바꾸는 것 없음) — 운영 AIMaster(esgxyikcnnvmlhygjkth)에서 묶음 적용 전에 실행
-- 기대값: 이미 있는 mall_builder 개체 0 · http 확장은 없거나 extensions 스키마 · 버킷 2개 없음 · profiles.is_admin 있음 · programs에 mall-builder 없음
select 'mall_builder 표' as 항목, count(*)::text as 값 from information_schema.tables where table_schema = 'public' and table_name like 'mall\_builder\_%'
union all select 'mall_builder 함수', count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'mall\_builder\_%'
union all select 'mall_builder_private 스키마', coalesce(to_regnamespace('mall_builder_private')::text, '없음')
union all select 'http 확장 스키마', coalesce((select n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'http'), '없음')
union all select 'extensions 스키마', coalesce(to_regnamespace('extensions')::text, '없음')
union all select 'mall-builder 버킷', coalesce(string_agg(id, ','), '없음') from storage.buckets where id like 'mall-builder%'
union all select 'mall_builder 저장소 규칙', count(*)::text from pg_policies where schemaname = 'storage' and policyname like 'mall\_builder%'
union all select 'profiles.is_admin', count(*)::text from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin'
union all select 'programs mall-builder', count(*)::text from public.programs where slug = 'mall-builder';
