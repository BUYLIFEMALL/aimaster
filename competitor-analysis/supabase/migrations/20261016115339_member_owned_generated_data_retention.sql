-- Prepared for approval: owner isolation + 30-day generated-content retention.
-- Legacy unowned research is NOT assigned/copied to any member.
create table public.competitor_company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null check (length(domain) between 1 and 253),
  company_name text,
  summary text,
  created_at timestamptz not null default now()
);
create index competitor_company_profiles_owner_domain_created_idx
  on public.competitor_company_profiles(user_id, domain, created_at desc);
create index competitor_company_profiles_created_idx on public.competitor_company_profiles(created_at);
alter table public.competitor_company_profiles enable row level security;
revoke all on public.competitor_company_profiles from public, anon, authenticated;
grant select, insert, delete on public.competitor_company_profiles to authenticated;
grant all on public.competitor_company_profiles to service_role;
create policy competitor_company_profiles_owner_select on public.competitor_company_profiles
  for select to authenticated using ((select auth.uid()) = user_id and created_at > now() - interval '30 days');
create policy competitor_company_profiles_owner_insert on public.competitor_company_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy competitor_company_profiles_owner_delete on public.competitor_company_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Remove the old globally readable/writable entry point, including direct REST calls.
revoke all on public.competitor_profiles from public, anon, authenticated;
drop policy if exists competitor_profiles_authenticated_select on public.competitor_profiles;
drop policy if exists competitor_profiles_authenticated_insert on public.competitor_profiles;
drop policy if exists competitor_profiles_authenticated_update on public.competitor_profiles;

-- Restrictive policies AND with existing owner policies. Expired content is invisible
-- immediately, even between hourly physical cleanups or via the direct REST API.
create policy competitor_jobs_retention on public.competitor_serp_jobs as restrictive
  for select to authenticated using (created_at > now() - interval '30 days');
create policy competitor_results_retention on public.competitor_serp_results as restrictive
  for select to authenticated using (created_at > now() - interval '30 days' and exists (
    select 1 from public.competitor_serp_jobs j where j.id = job_id and j.user_id = (select auth.uid())
  ));
create policy competitor_analyses_retention on public.competitor_analyses as restrictive
  for select to authenticated using (created_at > now() - interval '30 days' and exists (
    select 1 from public.competitor_serp_jobs j where j.id = job_id and j.user_id = (select auth.uid())
  ));
create policy competitor_jobs_owned_keyword on public.competitor_serp_jobs as restrictive
  for insert to authenticated with check (exists (
    select 1 from public.competitor_keywords k where k.id = keyword_id and k.user_id = (select auth.uid())
  ));
create policy competitor_results_owned_job on public.competitor_serp_results as restrictive
  for insert to authenticated with check (exists (
    select 1 from public.competitor_serp_jobs j where j.id = job_id and j.user_id = (select auth.uid())
  ));
create policy competitor_analyses_owned_job on public.competitor_analyses as restrictive
  for insert to authenticated with check (exists (
    select 1 from public.competitor_serp_jobs j where j.id = job_id and j.keyword_id = competitor_analyses.keyword_id
      and j.user_id = (select auth.uid())
  ));
-- Reports may change; ownership, run linkage and original expiry must not.
revoke update on public.competitor_analyses from authenticated, anon, public;
grant update(html_report) on public.competitor_analyses to authenticated;

-- Database time prevents a client from extending retention through forged timestamps.
-- SECURITY INVOKER: no RLS bypass; the research table is append-only for members.
create function public.competitor_stamp_content_created_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    new.created_at := old.created_at;
  elsif current_user = 'authenticated' then
    if TG_TABLE_NAME in ('competitor_serp_results', 'competitor_analyses') then
      select j.created_at into new.created_at from public.competitor_serp_jobs j
        where j.id = new.job_id and j.user_id = (select auth.uid());
      if new.created_at is null then raise exception 'Own active analysis run required' using errcode = '42501'; end if;
    else
      new.created_at := statement_timestamp();
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.competitor_stamp_content_created_at() from public, anon, authenticated;
create trigger competitor_company_profiles_stamp before insert or update on public.competitor_company_profiles
  for each row execute function public.competitor_stamp_content_created_at();
create trigger competitor_jobs_stamp before insert or update on public.competitor_serp_jobs
  for each row execute function public.competitor_stamp_content_created_at();
create trigger competitor_results_stamp before insert or update on public.competitor_serp_results
  for each row execute function public.competitor_stamp_content_created_at();
create trigger competitor_analyses_stamp before insert or update on public.competitor_analyses
  for each row execute function public.competitor_stamp_content_created_at();

create index if not exists competitor_jobs_created_retention_idx on public.competitor_serp_jobs(created_at);
create index if not exists competitor_results_created_retention_idx on public.competitor_serp_results(created_at);
create index if not exists competitor_analyses_created_retention_idx on public.competitor_analyses(created_at);
create index if not exists competitor_legacy_profiles_created_retention_idx on public.competitor_profiles(created_at);

-- Only postgres (cron owner) can execute this SECURITY INVOKER function.
-- Fixed scope: no credentials, keywords, tracked settings, other programs or Storage.
create function public.cleanup_competitor_generated_data() returns jsonb
language plpgsql set search_path = '' as $$
declare
  cutoff timestamptz := now() - interval '30 days';
  analyses_count bigint; results_count bigint; jobs_count bigint;
  profiles_count bigint; legacy_count bigint;
begin
  delete from public.competitor_analyses a where a.created_at <= cutoff
    or exists(select 1 from public.competitor_serp_jobs j where j.id = a.job_id and j.created_at <= cutoff);
  get diagnostics analyses_count = row_count;
  delete from public.competitor_serp_results r where r.created_at <= cutoff
    or exists(select 1 from public.competitor_serp_jobs j where j.id = r.job_id and j.created_at <= cutoff);
  get diagnostics results_count = row_count;
  delete from public.competitor_serp_jobs where created_at <= cutoff;
  get diagnostics jobs_count = row_count;
  delete from public.competitor_company_profiles where created_at <= cutoff;
  get diagnostics profiles_count = row_count;
  delete from public.competitor_profiles where created_at <= cutoff;
  get diagnostics legacy_count = row_count;
  return jsonb_build_object('analyses',analyses_count,'results',results_count,'jobs',jobs_count,
    'company_profiles',profiles_count,'legacy_profiles',legacy_count);
end;
$$;
revoke all on function public.cleanup_competitor_generated_data() from public, anon, authenticated, service_role;
-- UTC: every hour at :07; expiry access cutoff remains immediate at 30 days.
select cron.schedule('competitor-generated-data-retention-30d', '7 * * * *',
  'select public.cleanup_competitor_generated_data();');
