-- v1.27 operation profile and source queue foundation.
-- Every record is owned by one AIMaster member. The source queue stores only
-- member-submitted metadata; it never grants access to another member's keys.

create table if not exists public.tco_operation_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.tco_threads_accounts(id) on delete cascade,
  topic text not null default '',
  personality text not null default '',
  tone text not null default '',
  target_audience text not null default '',
  forbidden_topics text not null default '',
  forbidden_expressions text not null default '',
  daily_ratio smallint not null default 2 check (daily_ratio between 0 and 100),
  promotional_ratio smallint not null default 1 check (promotional_ratio between 0 and 100),
  daily_post_target smallint not null default 1 check (daily_post_target between 0 and 50),
  comment_check_interval_minutes smallint not null default 30 check (comment_check_interval_minutes between 5 and 1440),
  operating_start time,
  operating_end time,
  automation_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id)
);

create table if not exists public.tco_content_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.tco_threads_accounts(id) on delete cascade,
  source_type text not null check (source_type in ('daily', 'youtube', 'blog', 'coupang', 'naver_brand_connect')),
  title text not null default '',
  source_url text,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'ready' check (status in ('ready', 'used', 'archived', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tco_operation_profiles_user_account_idx
  on public.tco_operation_profiles(user_id, account_id);
create index if not exists tco_content_sources_user_account_status_idx
  on public.tco_content_sources(user_id, account_id, status, created_at desc);

alter table public.tco_operation_profiles enable row level security;
alter table public.tco_content_sources enable row level security;

revoke all on table public.tco_operation_profiles from anon, authenticated;
revoke all on table public.tco_content_sources from anon, authenticated;
grant select, insert, update, delete on table public.tco_operation_profiles to authenticated;
grant select, insert, update, delete on table public.tco_content_sources to authenticated;

create policy "tco_operation_profiles_select_own" on public.tco_operation_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "tco_operation_profiles_insert_own" on public.tco_operation_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "tco_operation_profiles_update_own" on public.tco_operation_profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tco_operation_profiles_delete_own" on public.tco_operation_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "tco_content_sources_select_own" on public.tco_content_sources
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "tco_content_sources_insert_own" on public.tco_content_sources
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "tco_content_sources_update_own" on public.tco_content_sources
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tco_content_sources_delete_own" on public.tco_content_sources
  for delete to authenticated using ((select auth.uid()) = user_id);
