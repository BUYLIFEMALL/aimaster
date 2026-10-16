-- Run AFTER candidate migration in ONE BEGIN/ROLLBACK transaction; never persist fixtures.
-- Uses existing admin/test UUIDs internally, does not create members, use API keys or print data.
select set_config('test.member_a',(select id::text from auth.users where email='buylifemall@naver.com'),'true');
select set_config('test.member_b',(select id::text from auth.users where email='buylifemall@gmail.com'),'true');
create temp table retention_baseline as select
  (select count(*) from public.competitor_keywords) keywords,
  (select count(*) from public.user_tracked_competitors) tracked,
  (select count(*) from public.user_api_keys) api_keys;
insert into public.competitor_keywords(id,user_id,keyword) values
  ('caa00000-0000-4000-8000-000000000001',current_setting('test.member_a')::uuid,'ROLLBACK retention A'),
  ('caa00000-0000-4000-8000-000000000002',current_setting('test.member_b')::uuid,'ROLLBACK retention B');
insert into public.competitor_serp_jobs(id,user_id,keyword_id,created_at) values
  ('cab00000-0000-4000-8000-000000000001',current_setting('test.member_a')::uuid,'caa00000-0000-4000-8000-000000000001',now()),
  ('cab00000-0000-4000-8000-000000000002',current_setting('test.member_b')::uuid,'caa00000-0000-4000-8000-000000000002',now()),
  ('cab00000-0000-4000-8000-000000000003',current_setting('test.member_a')::uuid,'caa00000-0000-4000-8000-000000000001',now()-interval '30 days');
insert into public.competitor_company_profiles(user_id,domain,summary,created_at) values
  (current_setting('test.member_a')::uuid,'retention-fixture.invalid','A fresh',now()),
  (current_setting('test.member_b')::uuid,'retention-fixture.invalid','B private',now()),
  (current_setting('test.member_a')::uuid,'boundary-expired.invalid','expired exact boundary',now()-interval '30 days'),
  (current_setting('test.member_a')::uuid,'boundary-inside.invalid','inside by 1ms',now()-interval '30 days'+interval '1 millisecond'),
  (current_setting('test.member_a')::uuid,'boundary-outside.invalid','outside by 1ms',now()-interval '30 days'-interval '1 millisecond');
insert into public.competitor_serp_results(user_id,job_id,result_type,domain,created_at) values
  (current_setting('test.member_a')::uuid,'cab00000-0000-4000-8000-000000000001','organic','retention-fixture.invalid',now()),
  (current_setting('test.member_b')::uuid,'cab00000-0000-4000-8000-000000000002','organic','retention-fixture.invalid',now()),
  (current_setting('test.member_a')::uuid,'cab00000-0000-4000-8000-000000000003','organic','retention-fixture.invalid',now()-interval '30 days');
insert into public.competitor_analyses(id,user_id,keyword_id,job_id,summary_text,created_at) values
  ('cac00000-0000-4000-8000-000000000001',current_setting('test.member_a')::uuid,'caa00000-0000-4000-8000-000000000001','cab00000-0000-4000-8000-000000000001','A',now()),
  ('cac00000-0000-4000-8000-000000000002',current_setting('test.member_b')::uuid,'caa00000-0000-4000-8000-000000000002','cab00000-0000-4000-8000-000000000002','B',now()),
  ('cac00000-0000-4000-8000-000000000003',current_setting('test.member_a')::uuid,'caa00000-0000-4000-8000-000000000001','cab00000-0000-4000-8000-000000000003','expired',now()-interval '30 days');

select set_config('request.jwt.claim.sub', current_setting('test.member_a'),true);
set local role authenticated;
do $$
declare affected int; stamp timestamptz;
begin
  if (select count(*) from public.competitor_company_profiles where domain like '%invalid') <> 2 then
    raise exception 'A isolation / exact 30d boundary failed'; end if;
  if exists(select 1 from public.competitor_company_profiles where summary='B private') then raise exception 'B data leaked'; end if;
  if (select count(*) from public.competitor_serp_jobs where id::text like 'cab00000%') <> 1 then raise exception 'job isolation/expiry failed'; end if;
  if (select count(*) from public.competitor_serp_results where domain='retention-fixture.invalid') <> 1 then raise exception 'result isolation/expiry failed'; end if;
  if (select count(*) from public.competitor_analyses where id::text like 'cac00000%') <> 1 then raise exception 'analysis isolation/expiry failed'; end if;
  begin
    insert into public.competitor_company_profiles(user_id,domain) values(current_setting('test.member_b')::uuid,'spoof.invalid');
    raise exception 'foreign owner insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform count(*) from public.competitor_profiles;
    raise exception 'legacy shared table still readable';
  exception when insufficient_privilege then null; end;
  begin
    perform public.cleanup_competitor_generated_data();
    raise exception 'member can run global cleanup';
  exception when insufficient_privilege then null; end;
  begin
    update public.competitor_company_profiles set summary='tampered' where domain='retention-fixture.invalid';
    raise exception 'append-only update was allowed';
  exception when insufficient_privilege then null; end;
  delete from public.competitor_company_profiles where user_id=current_setting('test.member_b')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'foreign delete allowed'; end if;
  insert into public.competitor_company_profiles(user_id,domain,created_at)
    values(current_setting('test.member_a')::uuid,'future-spoof.invalid',now()+interval '100 years') returning created_at into stamp;
  if stamp > clock_timestamp() or stamp < now() then raise exception 'forged content creation time allowed'; end if;
  delete from public.competitor_company_profiles where domain='future-spoof.invalid';
  begin
    insert into public.competitor_serp_results(user_id,job_id,result_type)
      values(current_setting('test.member_a')::uuid,'cab00000-0000-4000-8000-000000000002','ad');
    raise exception 'foreign job linkage allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.competitor_analyses(user_id,keyword_id,job_id)
      values(current_setting('test.member_a')::uuid,'caa00000-0000-4000-8000-000000000002','cab00000-0000-4000-8000-000000000001');
    raise exception 'foreign keyword linkage allowed';
  exception when insufficient_privilege then null; end;
  update public.competitor_analyses set html_report='<p>own report</p>' where id='cac00000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'own report update blocked'; end if;
  begin
    update public.competitor_analyses set created_at=now() where id='cac00000-0000-4000-8000-000000000001';
    raise exception 'report expiry can be extended';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('test.member_b'),true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.competitor_company_profiles where domain='retention-fixture.invalid') <> 1
    or exists(select 1 from public.competitor_company_profiles where summary='A fresh') then
    raise exception 'B sees A data'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform count(*) from public.competitor_company_profiles; raise exception 'anon table grant';
  exception when insufficient_privilege then null; end;
  begin perform public.cleanup_competitor_generated_data(); raise exception 'anon cleanup';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Exercise the real cleanup, including old live rows; the enclosing transaction
-- ROLLS BACK ALL deletes, DDL, grants, cron scheduling and fixtures afterwards.
select public.cleanup_competitor_generated_data();
do $$ begin
  if exists(select 1 from public.competitor_company_profiles where created_at <= now()-interval '30 days')
    or exists(select 1 from public.competitor_profiles where created_at <= now()-interval '30 days')
    or exists(select 1 from public.competitor_serp_jobs where created_at <= now()-interval '30 days')
    or exists(select 1 from public.competitor_serp_results where created_at <= now()-interval '30 days')
    or exists(select 1 from public.competitor_analyses where created_at <= now()-interval '30 days') then
    raise exception 'expired data survived cleanup'; end if;
  if (select count(*) from public.competitor_company_profiles) <> 3 then raise exception 'fresh profile removed'; end if;
  if (select count(*) from public.competitor_serp_jobs where id::text like 'cab00000%') <> 2 then raise exception 'fresh jobs removed'; end if;
  if (select count(*) from public.competitor_analyses where id::text like 'cac00000%') <> 2 then raise exception 'fresh analyses removed'; end if;
  if (select count(*) from public.competitor_keywords) <> (select keywords+2 from retention_baseline)
    or (select count(*) from public.user_tracked_competitors) <> (select tracked from retention_baseline)
    or (select count(*) from public.user_api_keys) <> (select api_keys from retention_baseline) then
    raise exception 'settings or keys were removed'; end if;
  if (select count(*) from cron.job where jobname='competitor-generated-data-retention-30d'
    and schedule='7 * * * *' and active) <> 1 then raise exception 'cron registration failed'; end if;
  if has_function_privilege('service_role','public.cleanup_competitor_generated_data()','EXECUTE') then
    raise exception 'unnecessary service RPC exposed'; end if;
end $$;
