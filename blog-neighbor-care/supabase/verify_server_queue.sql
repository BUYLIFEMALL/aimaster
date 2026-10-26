-- 운영 적용 후 읽기 전용 확인. 대상 프로젝트 ref esgxyikcnnvmlhygjkth.
select current_database(),current_user;
select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace
  and relname in ('bnc_runtime','bnc_settings','bnc_jobs','bnc_daily','bnc_comment_slots','bnc_neighbors') order by relname;
select live_allowed,policy_reference from public.bnc_runtime;
select role_name,has_function_privilege(role_name,'public.bnc_dispatch(uuid,text,jsonb)','EXECUTE') as can_execute
  from (values('anon'),('authenticated'),('service_role')) x(role_name);
select has_table_privilege('service_role','public.bnc_runtime','UPDATE') as server_can_enable_live,
  has_table_privilege('authenticated','public.bnc_jobs','UPDATE') as member_can_edit_job_directly;
select n.nspname,p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='public' and p.proname='bnc_dispatch') or n.nspname='bnc_private';
select count(*) as job_count from public.bnc_jobs;
