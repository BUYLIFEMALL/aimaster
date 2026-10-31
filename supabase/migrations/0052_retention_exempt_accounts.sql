-- 관리자·시험 계정 30일 자동 삭제 예외 1단계(주인님 승인 2026-11-01, 추가 배포 없는 방식).
-- 플랜: docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md
-- 범위: 표시 칸 + 보호 트리거 + DB 예약 삭제(pg_cron) 9개 작업 중 회원 자료를 지우는 곳.
-- 제외: competitor_profiles(회원 칸 없는 옛 표), dt_operations(24시간 작업 기록), 조회 숨김 RLS, Vercel 정리 라우트(프로그램 다음 배포 때).
begin;

alter table public.profiles add column if not exists retention_exempt boolean not null default false;
comment on column public.profiles.retention_exempt is '30일 자동 삭제 예외 계정 표시. 회원이 직접 바꿀 수 없음';

-- 일반 회원은 profiles 자기 행을 수정할 수 있으므로 이 칸만 막는다
create or replace function public.profiles_protect_retention_exempt() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.retention_exempt := false;
    elsif new.retention_exempt is distinct from old.retention_exempt then
      raise exception 'retention_exempt cannot be changed by members';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_retention_exempt on public.profiles;
create trigger profiles_protect_retention_exempt before insert or update of retention_exempt on public.profiles
  for each row execute function public.profiles_protect_retention_exempt();

update public.profiles set retention_exempt = true
where id in (select id from auth.users where email in ('buylifemall@gmail.com', 'buylifemall@naver.com'));

do $$
begin
  if (select count(*) from public.profiles where retention_exempt) <> 2 then
    raise exception 'retention_exempt must be set on exactly 2 accounts';
  end if;
end $$;

-- 삭제 함수: 원문(운영과 일치 확인)에 예외 계정 조건만 추가
create or replace function public.cleanup_ais_expired_custom_prompts() returns integer
language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  delete from public.ais_user_style_prompts t where t.expires_at <= now()
    and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create or replace function public.cleanup_blog_keyword_reports() returns integer
language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  delete from public.blog_keyword_reports t
  where t.favorite = false and t.created_at <= now() - interval '30 days'
    and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create or replace function public.cleanup_competitor_generated_data() returns jsonb
language plpgsql set search_path = '' as $$
declare
  cutoff timestamptz := now() - interval '30 days';
  analyses_count bigint; results_count bigint; jobs_count bigint;
  profiles_count bigint; legacy_count bigint;
begin
  delete from public.competitor_analyses a where (a.created_at <= cutoff
    or exists(select 1 from public.competitor_serp_jobs j where j.id = a.job_id and j.created_at <= cutoff))
    and not exists (select 1 from public.profiles p where p.id = a.user_id and p.retention_exempt);
  get diagnostics analyses_count = row_count;
  delete from public.competitor_serp_results r where (r.created_at <= cutoff
    or exists(select 1 from public.competitor_serp_jobs j where j.id = r.job_id and j.created_at <= cutoff))
    and not exists (select 1 from public.profiles p where p.id = r.user_id and p.retention_exempt);
  get diagnostics results_count = row_count;
  delete from public.competitor_serp_jobs t where t.created_at <= cutoff
    and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics jobs_count = row_count;
  delete from public.competitor_company_profiles t where t.created_at <= cutoff
    and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics profiles_count = row_count;
  delete from public.competitor_profiles where created_at <= cutoff;
  get diagnostics legacy_count = row_count;
  return jsonb_build_object('analyses',analyses_count,'results',results_count,'jobs',jobs_count,
    'company_profiles',profiles_count,'legacy_profiles',legacy_count);
end;
$$;

create or replace function public.cleanup_longtail_generated_data() returns jsonb
language plpgsql set search_path = '' as $$
declare
  cutoff timestamptz := now() - interval '30 days';
  runs_count bigint; expansions_count bigint; related_count bigint;
begin
  delete from public.longtail_runs t where t.executed_at <= cutoff
    and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics runs_count = row_count;
  delete from public.longtail_expansions t where t.created_at <= cutoff
    and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics expansions_count = row_count;
  delete from public.longtail_related_keywords t where t.created_at <= cutoff
    and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics related_count = row_count;
  return jsonb_build_object('runs', runs_count, 'expansions', expansions_count, 'related', related_count);
end;
$$;

create or replace function public.cleanup_music_studio_projects() returns bigint
language plpgsql set search_path = '' as $$
declare n bigint;
begin
  delete from public.music_studio_projects t where t.updated_at <= now() - interval '30 days'
    and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.cleanup_yvs_expired_favorites() returns bigint
language plpgsql security invoker set search_path = '' as $$
declare removed bigint;
begin
  delete from public.yvs_favorites t where t.created_at <= now() - interval '30 days'
    and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- 함수 없이 바로 지우는 예약 작업(같은 이름이면 명령만 바뀜, 주기 유지)
select cron.schedule('dcb-retention-30d', '30 18 * * *',
  $c$delete from public.dcb_rooms t where t.created_at < now() - interval '30 days' and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
    delete from public.dcb_documents t where t.created_at < now() - interval '30 days' and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);$c$);

select cron.schedule('document-translator-project-retention', '35 * * * *',
  $c$delete from public.dt_projects t where t.expires_at<=now() and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
    delete from public.dt_operations where created_at<now()-interval '24 hours'$c$);

select cron.schedule('lyric-video-studio-retention', '17 * * * *',
  $c$delete from public.lyric_video_items t where t.created_at < now() - interval '30 days' and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt)$c$);

commit;
