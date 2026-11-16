-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth
-- 목적: 「떡상 시장 탐색」(boks-youtube-finder 이식, v1.30) — 2026-11-16 주인님 승인(DB 표 2개 추가)
--   1) yvs_youtube_usage: 회원·키(해시 앞 16자)·태평양 날짜별 YouTube 사용량(검색 횟수·조회 유닛) — 검색 전 남은 횟수로 미리 막기
--   2) yvs_channel_uploads_cache: 회원별 채널 최근 업로드 통계(평소 조회수 계산용) — 24시간 동안 재사용해 회원 쿼터 절약
-- 회원 격리: 두 표 모두 RLS 회원 본인만 읽기, 쓰기는 서버(service_role)만. 키 원문은 저장하지 않는다.
-- 정리: 사용량은 30일(관리자·시험 계정 등 retention_exempt 회원 제외), 채널 캐시는 다시 받을 수 있는 공개 통계 캐시라 7일 뒤 모두 삭제(판정은 24시간 기준).
-- 표가 없어도 프로그램은 동작한다(캐시·사용량 기록만 건너뜀).
-- 되돌리기: select cron.unschedule('yvs-viral-finder-cleanup'); drop function public.cleanup_yvs_viral_finder(); drop function public.yvs_add_youtube_usage(uuid,text,text,int,int); drop table public.yvs_channel_uploads_cache; drop table public.yvs_youtube_usage;
begin;

create table public.yvs_youtube_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null check (key_hash ~ '^[0-9a-f]{16}$'),
  quota_day text not null check (quota_day ~ '^\d{4}-\d{2}-\d{2}$'),
  search_calls integer not null default 0 check (search_calls >= 0),
  units integer not null default 0 check (units >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, key_hash, quota_day)
);
create index yvs_youtube_usage_updated_at_idx on public.yvs_youtube_usage(updated_at);
alter table public.yvs_youtube_usage enable row level security;
revoke all on public.yvs_youtube_usage from public, anon, authenticated;
grant select on public.yvs_youtube_usage to authenticated;
grant select, insert, update, delete on public.yvs_youtube_usage to service_role;
create policy yvs_youtube_usage_owner_read on public.yvs_youtube_usage for select to authenticated
  using (user_id = (select auth.uid()));

create table public.yvs_channel_uploads_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id text not null check (channel_id ~ '^UC[0-9A-Za-z_-]{22}$'),
  fetched_at timestamptz not null default now(),
  uploads jsonb not null check (jsonb_typeof(uploads) = 'array' and octet_length(uploads::text) <= 16384),
  primary key (user_id, channel_id)
);
create index yvs_channel_uploads_cache_fetched_at_idx on public.yvs_channel_uploads_cache(fetched_at);
alter table public.yvs_channel_uploads_cache enable row level security;
revoke all on public.yvs_channel_uploads_cache from public, anon, authenticated;
grant select on public.yvs_channel_uploads_cache to authenticated;
grant select, insert, update, delete on public.yvs_channel_uploads_cache to service_role;
create policy yvs_channel_uploads_cache_owner_read on public.yvs_channel_uploads_cache for select to authenticated
  using (user_id = (select auth.uid()));

-- 사용량을 한 번에 더한다(동시 요청에도 숫자가 사라지지 않게). 서버(service_role)만 부른다.
create function public.yvs_add_youtube_usage(p_user uuid, p_key text, p_day text, p_search integer, p_units integer)
  returns void language sql security invoker set search_path = '' as $$
  insert into public.yvs_youtube_usage as u (user_id, key_hash, quota_day, search_calls, units, updated_at)
  values (p_user, p_key, p_day, greatest(p_search, 0), greatest(p_units, 0), now())
  on conflict (user_id, key_hash, quota_day) do update
    set search_calls = u.search_calls + greatest(p_search, 0),
        units = u.units + greatest(p_units, 0),
        updated_at = now();
$$;
revoke all on function public.yvs_add_youtube_usage(uuid, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.yvs_add_youtube_usage(uuid, text, text, integer, integer) to service_role;

create function public.cleanup_yvs_viral_finder() returns bigint
  language plpgsql security invoker set search_path = '' as $$
declare removed bigint; c bigint;
begin
  delete from public.yvs_youtube_usage t
    where t.updated_at <= now() - interval '30 days'
      and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics removed = row_count;
  delete from public.yvs_channel_uploads_cache where fetched_at <= now() - interval '7 days';
  get diagnostics c = row_count;
  return removed + c;
end;
$$;
revoke all on function public.cleanup_yvs_viral_finder() from public, anon, authenticated, service_role;
select cron.schedule('yvs-viral-finder-cleanup', '17 4 * * *', 'select public.cleanup_yvs_viral_finder();');

commit;
