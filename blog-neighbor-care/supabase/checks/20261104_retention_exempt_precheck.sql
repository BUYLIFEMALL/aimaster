-- v1.15 열외 마이그레이션(20261104120000_bnc_retention_exempt.sql) 적용 전 운영 DB 대조(읽기 전용).
-- 결과가 저장소 기준값과 모두 같아야 적용한다. 하나라도 다르면 멈추고 차이부터 확인.
-- 기준값(로컬 Postgres 17에 저장소 마이그레이션을 순서대로 적용해 계산, 2026-11-04):
--   monitor_dispatch_md5=22d8a02bd932f9231cf0a291fdffeccf, engagement_guard_md5=6e9c5e5460efadf7de89a8da2f7b16cf,
--   expiry_checks=9, update_triggers=bnc_engagement_inbox.bnc_engagement_source_guard,bnc_jobs.bnc_post_directory_guard,
--   bnc_jobs.bnc_reply_target_guard,bnc_jobs.bnc_work_accept_guard,bnc_jobs.bnc_work_accept_schedule_guard,
--   already_applied=false, exempt_accounts=2(운영; 로컬은 0)
select jsonb_build_object(
 'monitor_dispatch_md5', md5(pg_get_functiondef('public.bnc_monitor_dispatch(uuid,text,jsonb)'::regprocedure)),
 'engagement_guard_md5', md5(pg_get_functiondef('bnc_private.guard_engagement_source()'::regprocedure)),
 'expiry_checks', (select count(*) from pg_constraint con join pg_class t on t.oid=con.conrelid join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='public' and con.contype='c' and pg_get_constraintdef(con.oid) like '%expires_at%' and t.relname = any(array[
   'bnc_jobs','bnc_reader_requests','bnc_reader_materials','bnc_analysis_sources','bnc_analysis_jobs','bnc_neighbor_imports',
   'bnc_execution_evidence','bnc_engagement_inbox','bnc_extension_runs','bnc_extension_context_reads','bnc_return_visit_posts',
   'bnc_message_jobs','bnc_accept_reads','bnc_incoming_requests','bnc_accept_jobs','bnc_post_targets','bnc_feed_checks','bnc_monitor_attempts'])),
 'update_triggers', (select string_agg(t.relname||'.'||tg.tgname,',' order by 1) from pg_trigger tg join pg_class t on t.oid=tg.tgrelid
   where not tg.tgisinternal and t.relname like 'bnc\_%' and (tg.tgtype & 16)<>0),
 'already_applied', exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='bnc_private' and p.proname='keep_exempt_expiry'),
 'exempt_accounts', (select count(*) from public.profiles where retention_exempt)
);
