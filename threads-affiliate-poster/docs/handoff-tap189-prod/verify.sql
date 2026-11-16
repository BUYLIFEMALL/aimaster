-- 실행 뒤 확인(읽기 전용) — 운영 프로젝트(ref esgxyikcnnvmlhygjkth) SQL 편집기. 마지막 줄 「전체」의 판정이 OK면 성공
with chk as (
  select 1 o, '회원+링크 고유 인덱스' 항목, '1' 기대, (select count(*) from pg_indexes where schemaname = 'public' and indexname = 'tap_collect_queue_user_url_uniq')::text 실제
  union all select 2, '상품 연결 고유 인덱스', '1', (select count(*) from pg_indexes where schemaname = 'public' and indexname = 'tap_collect_queue_product_uniq')::text
  union all select 3, '등록 함수 tap_register_collected', '1', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'tap_register_collected')::text
  union all select 4, '함수가 회원 권한으로 실행(security invoker)', 'false', (select bool_or(p.prosecdef) from pg_proc p where p.proname = 'tap_register_collected')::text
  union all select 5, '로그인 회원(authenticated) 실행 가능', 'true', has_function_privilege('authenticated', 'public.tap_register_collected(jsonb)', 'execute')::text
  union all select 6, '비로그인(anon) 실행 불가', 'false', has_function_privilege('anon', 'public.tap_register_collected(jsonb)', 'execute')::text
  union all select 7, '적용 기록 1줄', '1', (select count(*) from supabase_migrations.schema_migrations where name = 'tap_collect_queue_atomic')::text
  union all select 8, '대기열 본인 RLS 그대로 켜짐', 'true', (select relrowsecurity from pg_class where oid = 'public.tap_collect_queue'::regclass)::text
)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from chk
union all select 9, '전체', '8/8', (select count(*) from chk where 기대 = 실제)::text || '/8', case when (select bool_and(기대 = 실제) from chk) then 'OK' else '확인 필요' end
order by 1;
