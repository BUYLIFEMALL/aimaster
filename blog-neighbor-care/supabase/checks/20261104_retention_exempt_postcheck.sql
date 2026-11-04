-- v1.15 열외 마이그레이션 적용 뒤 운영 DB 확인(읽기 전용).
-- 기대값: applied=true, triggers=18, monitor_cleanup_exempt=true, exempt_rows_left_30d=0, normal_rows_unlimited=0, exempt_rows_unlimited>=0(표별)
with far as (select '9999-12-31 00:00:00+00'::timestamptz v),
t(name) as (select unnest(array['bnc_jobs','bnc_reader_requests','bnc_reader_materials','bnc_analysis_sources','bnc_analysis_jobs',
 'bnc_neighbor_imports','bnc_execution_evidence','bnc_engagement_inbox','bnc_extension_runs','bnc_extension_context_reads',
 'bnc_return_visit_posts','bnc_message_jobs','bnc_accept_reads','bnc_incoming_requests','bnc_accept_jobs','bnc_post_targets',
 'bnc_feed_checks','bnc_monitor_attempts'])),
c as (select t.name,query_to_xml(format(
  'select count(*) filter (where p.retention_exempt and x.expires_at=%L) ex_far, count(*) filter (where p.retention_exempt and x.expires_at>now()+interval ''1 day'' and x.expires_at<%L) ex_30d, count(*) filter (where not coalesce(p.retention_exempt,false) and x.expires_at=%L) normal_far from public.%I x left join public.profiles p on p.id=x.user_id',
  (select v from far),(select v from far),(select v from far),t.name),false,true,'') x from t)
select jsonb_build_object(
 'applied', exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='bnc_private' and p.proname='keep_exempt_expiry'),
 'triggers', (select count(*) from pg_trigger where tgname='bnc_keep_exempt_expiry' and not tgisinternal),
 'monitor_cleanup_exempt', position('retention_exempt(mo.user_id)' in pg_get_functiondef('public.bnc_monitor_dispatch(uuid,text,jsonb)'::regprocedure))>0,
 'exempt_rows_unlimited', (select sum((xpath('/row/ex_far/text()',x))[1]::text::int) from c),
 'exempt_rows_left_30d', (select sum((xpath('/row/ex_30d/text()',x))[1]::text::int) from c),
 'normal_rows_unlimited', (select sum((xpath('/row/normal_far/text()',x))[1]::text::int) from c),
 'per_table_exempt_unlimited', (select jsonb_object_agg(name,(xpath('/row/ex_far/text()',x))[1]::text::int) from c)
);
