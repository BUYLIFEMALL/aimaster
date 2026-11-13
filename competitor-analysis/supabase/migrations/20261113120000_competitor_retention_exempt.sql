-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth (부모 세션이 주인님 승인 뒤 적용 — 이 파일 작성 세션은 적용하지 않음)
-- 목적: 분석 결과·키워드 확장의 30일 정리·조회에서 profiles.retention_exempt = true 회원
--       (관리자·시험 계정·저장 구독 연장 회원) 제외 (2026-11-13). 제휴 채널 정리(20261105140000)와 같은 판정 함수를 쓴다.
--   1) competitor_retention_exempt(uuid): 제휴 채널 마이그레이션과 같은 정의(운영에 없을 때를 대비해 create or replace)
--   2) cleanup_competitor_generated_data(): 분석·검색결과·실행·회사 조사에서 예외 회원 행은 지우지 않음
--      (주인 없는 옛 competitor_profiles 정리는 그대로)
--   3) cleanup_longtail_generated_data(): 롱테일 실행·확장·연관 키워드에서 예외 회원 행은 지우지 않음
--   4) 30일 조회 차단 정책 4개: 예외 회원 본인은 30일 지난 행도 보임
--   pg_cron 작업(competitor-generated-data-retention-30d 매시 07분, longtail-generated-data-retention-30d 매시 09분)은 그대로.
-- 되돌리기: 20261016115339_member_owned_generated_data_retention.sql 과 20261023120000_merge_a_longtail_retention.sql 의
--   두 함수 본문·정책 4개(competitor_company_profiles_owner_select, competitor_jobs_retention, competitor_results_retention,
--   competitor_analyses_retention)를 다시 만든다. competitor_retention_exempt 는 제휴 채널 정리가 쓰므로 남긴다.
begin;

create or replace function public.competitor_retention_exempt(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.retention_exempt from public.profiles p where p.id = p_user), false);
$$;
revoke all on function public.competitor_retention_exempt(uuid) from public, anon;
grant execute on function public.competitor_retention_exempt(uuid) to authenticated, service_role;

create or replace function public.cleanup_competitor_generated_data() returns jsonb
language plpgsql set search_path = '' as $$
declare
  cutoff timestamptz := now() - interval '30 days';
  analyses_count bigint; results_count bigint; jobs_count bigint;
  profiles_count bigint; legacy_count bigint;
begin
  delete from public.competitor_analyses a where (a.created_at <= cutoff
    or exists(select 1 from public.competitor_serp_jobs j where j.id = a.job_id and j.created_at <= cutoff))
    and not public.competitor_retention_exempt(a.user_id);
  get diagnostics analyses_count = row_count;
  delete from public.competitor_serp_results r where (r.created_at <= cutoff
    or exists(select 1 from public.competitor_serp_jobs j where j.id = r.job_id and j.created_at <= cutoff))
    and not public.competitor_retention_exempt(r.user_id);
  get diagnostics results_count = row_count;
  delete from public.competitor_serp_jobs j where j.created_at <= cutoff
    and not public.competitor_retention_exempt(j.user_id);
  get diagnostics jobs_count = row_count;
  delete from public.competitor_company_profiles c where c.created_at <= cutoff
    and not public.competitor_retention_exempt(c.user_id);
  get diagnostics profiles_count = row_count;
  delete from public.competitor_profiles where created_at <= cutoff;
  get diagnostics legacy_count = row_count;
  return jsonb_build_object('analyses',analyses_count,'results',results_count,'jobs',jobs_count,
    'company_profiles',profiles_count,'legacy_profiles',legacy_count);
end;
$$;
revoke all on function public.cleanup_competitor_generated_data() from public, anon, authenticated, service_role;

create or replace function public.cleanup_longtail_generated_data() returns jsonb
language plpgsql set search_path = '' as $$
declare
  cutoff timestamptz := now() - interval '30 days';
  runs_count bigint; expansions_count bigint; related_count bigint;
begin
  delete from public.longtail_runs t where t.executed_at <= cutoff
    and not public.competitor_retention_exempt(t.user_id);
  get diagnostics runs_count = row_count;
  delete from public.longtail_expansions t where t.created_at <= cutoff
    and not public.competitor_retention_exempt(t.user_id);
  get diagnostics expansions_count = row_count;
  delete from public.longtail_related_keywords t where t.created_at <= cutoff
    and not public.competitor_retention_exempt(t.user_id);
  get diagnostics related_count = row_count;
  return jsonb_build_object('runs', runs_count, 'expansions', expansions_count, 'related', related_count);
end;
$$;
revoke all on function public.cleanup_longtail_generated_data() from public, anon, authenticated, service_role;

drop policy if exists competitor_company_profiles_owner_select on public.competitor_company_profiles;
create policy competitor_company_profiles_owner_select on public.competitor_company_profiles
  for select to authenticated using ((select auth.uid()) = user_id
    and (created_at > now() - interval '30 days' or public.competitor_retention_exempt(user_id)));
drop policy if exists competitor_jobs_retention on public.competitor_serp_jobs;
create policy competitor_jobs_retention on public.competitor_serp_jobs as restrictive
  for select to authenticated using (created_at > now() - interval '30 days'
    or public.competitor_retention_exempt((select auth.uid())));
drop policy if exists competitor_results_retention on public.competitor_serp_results;
create policy competitor_results_retention on public.competitor_serp_results as restrictive
  for select to authenticated using ((created_at > now() - interval '30 days'
    or public.competitor_retention_exempt((select auth.uid()))) and exists (
    select 1 from public.competitor_serp_jobs j where j.id = job_id and j.user_id = (select auth.uid())
  ));
drop policy if exists competitor_analyses_retention on public.competitor_analyses;
create policy competitor_analyses_retention on public.competitor_analyses as restrictive
  for select to authenticated using ((created_at > now() - interval '30 days'
    or public.competitor_retention_exempt((select auth.uid()))) and exists (
    select 1 from public.competitor_serp_jobs j where j.id = job_id and j.user_id = (select auth.uid())
  ));
commit;
