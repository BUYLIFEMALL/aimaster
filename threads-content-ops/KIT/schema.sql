-- =====================================================================
-- Threads 콘텐츠 운영 자동화 — 새 Supabase 프로젝트용 전체 스키마 (강의용 설치 키트, 2026-10-18)
-- 사용법: Supabase 대시보드 → SQL Editor → New query → 이 파일 전체를 붙여넣고 Run.
-- 빈 새 프로젝트에서 실행합니다. 다시 실행해도 대부분 건너뛰도록 if not exists / drop if exists 를 썼습니다.
-- 데이터는 들어 있지 않고 구조(테이블·제약·인덱스·보안 정책·이미지 버킷)만 만듭니다.
-- =====================================================================

-- gen_random_uuid() 는 Postgres 13+ 기본 내장(Supabase 포함)이라 확장이 필요 없습니다.

-- 공통: updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 회원 프로필(가입하면 자동 생성). is_admin=true 인 계정은 관리자입니다.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  is_admin boolean not null default false,
  is_suspended boolean not null default false,
  grade_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 프로그램 정보(사용량 기록용 한 줄). 독립 운영 모드에서는 이용 권한 판정에 쓰이지 않습니다.
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  is_active boolean not null default true,
  badges text[] not null default '{}'::text[],
  required_grade_id uuid,
  version text,
  created_at timestamptz not null default now()
);
alter table public.programs enable row level security;
drop policy if exists programs_select_all on public.programs;
create policy programs_select_all on public.programs for select to public using (true);
insert into public.programs (slug, name, badges) values ('threads-content-ops', 'Threads 콘텐츠 운영 자동화', array['free']) on conflict (slug) do nothing;

-- 이용 권한 관련 빈 테이블(코드 호환용, 독립 운영 모드에서는 사용하지 않음)
create table if not exists public.member_grades (id uuid primary key default gen_random_uuid(), name text, sort_order int not null default 0);
create table if not exists public.subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, program_id uuid references public.programs(id) on delete cascade, status text, expires_at timestamptz);
create table if not exists public.user_program_access (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, program_id uuid references public.programs(id) on delete cascade, expires_at timestamptz);
alter table public.member_grades enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_program_access enable row level security;

-- 회원 본인 API 키(OpenAI·Gemini·Meta 앱 ID/시크릿 등). 본인 것만 읽고 쓸 수 있습니다.
create table if not exists public.user_api_keys (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_api_keys_user_provider_unique unique (user_id, provider),
  constraint user_api_keys_provider_check check (provider = any (array['openai','anthropic','gemini','perplexity','suno','json2video','google_client_id','google_client_secret','replicate','serpapi','meta_app_id','meta_app_secret','threads_app_id','threads_app_secret','coupang_access_key','coupang_secret_key','aliexpress_app_key','aliexpress_app_secret','aliexpress_tracking_id','naver_client_id','naver_client_secret','ncp_access_key','ncp_secret_key','kakao_rest_api_key','kakao_admin_key','kakao_client_secret','naver_ads_api_key','naver_ads_secret_key','naver_ads_customer_id','domeggook_api_key','youtube_api_key','elevenst_api_key','toss_access_key','toss_secret_key','toss_publisher_id','seoul_opendata_api_key','data_go_kr_service_key','vworld_api_key','vworld_domain','unsplash','pexels','pixabay','facebook_app_id','facebook_app_secret','cronjob_org_api_key']::text[]))
);
alter table public.user_api_keys enable row level security;
drop policy if exists user_api_keys_select_own on public.user_api_keys;
create policy user_api_keys_select_own on public.user_api_keys for select to public using (auth.uid() = user_id);
drop policy if exists user_api_keys_insert_own on public.user_api_keys;
create policy user_api_keys_insert_own on public.user_api_keys for insert to public with check (auth.uid() = user_id);
drop policy if exists user_api_keys_update_own on public.user_api_keys;
create policy user_api_keys_update_own on public.user_api_keys for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists user_api_keys_delete_own on public.user_api_keys;
create policy user_api_keys_delete_own on public.user_api_keys for delete to public using (auth.uid() = user_id);
drop trigger if exists user_api_keys_set_updated_at on public.user_api_keys;
create trigger user_api_keys_set_updated_at before update on public.user_api_keys for each row execute function public.set_updated_at();

-- AI 사용량 기록(서버가 서비스 키로 기록)
create table if not exists public.usage_logs (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  action text not null,
  quantity integer not null default 1,
  credits_used numeric(10,2) not null default 0,
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_usage_logs_user_program on public.usage_logs (user_id, program_id);
alter table public.usage_logs enable row level security;
drop policy if exists usage_logs_select_own on public.usage_logs;
create policy usage_logs_select_own on public.usage_logs for select to public using (auth.uid() = user_id);

-- ===================== Threads 콘텐츠 운영 자동화 전용 =====================
create table if not exists public.tco_threads_accounts (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  threads_user_id text not null,
  username text,
  access_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tco_threads_accounts_user_id_threads_user_id_key unique (user_id, threads_user_id)
);
create index if not exists tco_threads_accounts_user_id_idx on public.tco_threads_accounts (user_id);

create table if not exists public.tco_viral_categories (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tco_viral_categories_name_check check (char_length(name) >= 1 and char_length(name) <= 20)
);
create unique index if not exists tco_viral_categories_user_name_idx on public.tco_viral_categories (user_id, lower(name));

create table if not exists public.tco_posts (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.tco_threads_accounts(id) on delete cascade,
  body text not null,
  status text not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  threads_post_id text,
  permalink text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  media jsonb not null default '[]'::jsonb,
  category_id uuid references public.tco_viral_categories(id) on delete set null,
  constraint tco_posts_media_is_array check (jsonb_typeof(media) = 'array'),
  constraint tco_posts_status_check check (status = any (array['draft','scheduled','publishing','published','failed','cancelled']::text[]))
);
create index if not exists tco_posts_user_id_status_idx on public.tco_posts (user_id, status, scheduled_at);
create index if not exists tco_posts_user_category_idx on public.tco_posts (user_id, category_id);

create table if not exists public.tco_content_sources (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.tco_threads_accounts(id) on delete cascade,
  source_type text not null,
  title text not null default '',
  source_url text,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'ready',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tco_content_sources_source_type_check check (source_type = any (array['daily','youtube','blog','coupang','naver_brand_connect','aliexpress','toss']::text[])),
  constraint tco_content_sources_status_check check (status = any (array['ready','used','archived','failed']::text[]))
);
create index if not exists tco_content_sources_user_account_status_idx on public.tco_content_sources (user_id, account_id, status, created_at desc);

create table if not exists public.tco_viral_candidates (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null,
  source_input text not null default '',
  title text not null default '',
  content text not null default '',
  keywords text[] not null default '{}'::text[],
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  category_id uuid references public.tco_viral_categories(id) on delete set null,
  constraint tco_viral_candidates_method_check check (method = any (array['http','perplexity']::text[])),
  constraint tco_viral_candidates_status_check check (status = any (array['ready','used','archived']::text[]))
);
create index if not exists tco_viral_candidates_user_status_idx on public.tco_viral_candidates (user_id, status, created_at desc);
create index if not exists tco_viral_candidates_category_idx on public.tco_viral_candidates (user_id, category_id);

create table if not exists public.tco_operation_profiles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.tco_threads_accounts(id) on delete cascade,
  topic text not null default '',
  personality text not null default '',
  tone text not null default '',
  target_audience text not null default '',
  forbidden_topics text not null default '',
  forbidden_expressions text not null default '',
  daily_ratio smallint not null default 2,
  promotional_ratio smallint not null default 1,
  daily_post_target smallint not null default 1,
  comment_check_interval_minutes smallint not null default 30,
  operating_start time,
  operating_end time,
  automation_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tco_operation_profiles_user_id_account_id_key unique (user_id, account_id),
  constraint tco_operation_profiles_comment_check_interval_minutes_check check (comment_check_interval_minutes >= 5 and comment_check_interval_minutes <= 1440),
  constraint tco_operation_profiles_daily_post_target_check check (daily_post_target >= 0 and daily_post_target <= 50),
  constraint tco_operation_profiles_daily_ratio_check check (daily_ratio >= 0 and daily_ratio <= 100),
  constraint tco_operation_profiles_promotional_ratio_check check (promotional_ratio >= 0 and promotional_ratio <= 100)
);
create index if not exists tco_operation_profiles_user_account_idx on public.tco_operation_profiles (user_id, account_id);

-- 데스크톱·확장 연결용 개인 토큰(선택 기능)
create table if not exists public.personal_access_tokens (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_slug text not null,
  label text,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists personal_access_tokens_user_id_idx on public.personal_access_tokens (user_id);
alter table public.personal_access_tokens enable row level security;
drop policy if exists personal_access_tokens_select_own on public.personal_access_tokens;
create policy personal_access_tokens_select_own on public.personal_access_tokens for select to public using (auth.uid() = user_id);

alter table public.tco_threads_accounts enable row level security;
drop policy if exists tco_accounts_owner_only on public.tco_threads_accounts;
create policy tco_accounts_owner_only on public.tco_threads_accounts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.tco_posts enable row level security;
drop policy if exists tco_posts_owner_only on public.tco_posts;
create policy tco_posts_owner_only on public.tco_posts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.tco_content_sources enable row level security;
alter table public.tco_viral_candidates enable row level security;
alter table public.tco_viral_categories enable row level security;
alter table public.tco_operation_profiles enable row level security;
drop policy if exists tco_content_sources_select_own on public.tco_content_sources;
create policy tco_content_sources_select_own on public.tco_content_sources for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists tco_content_sources_insert_own on public.tco_content_sources;
create policy tco_content_sources_insert_own on public.tco_content_sources for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists tco_content_sources_update_own on public.tco_content_sources;
create policy tco_content_sources_update_own on public.tco_content_sources for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists tco_content_sources_delete_own on public.tco_content_sources;
create policy tco_content_sources_delete_own on public.tco_content_sources for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists tco_viral_candidates_select_own on public.tco_viral_candidates;
create policy tco_viral_candidates_select_own on public.tco_viral_candidates for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists tco_viral_candidates_insert_own on public.tco_viral_candidates;
create policy tco_viral_candidates_insert_own on public.tco_viral_candidates for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists tco_viral_candidates_update_own on public.tco_viral_candidates;
create policy tco_viral_candidates_update_own on public.tco_viral_candidates for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists tco_viral_candidates_delete_own on public.tco_viral_candidates;
create policy tco_viral_candidates_delete_own on public.tco_viral_candidates for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists tco_viral_categories_select_own on public.tco_viral_categories;
create policy tco_viral_categories_select_own on public.tco_viral_categories for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists tco_viral_categories_insert_own on public.tco_viral_categories;
create policy tco_viral_categories_insert_own on public.tco_viral_categories for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists tco_viral_categories_update_own on public.tco_viral_categories;
create policy tco_viral_categories_update_own on public.tco_viral_categories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists tco_viral_categories_delete_own on public.tco_viral_categories;
create policy tco_viral_categories_delete_own on public.tco_viral_categories for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists tco_operation_profiles_select_own on public.tco_operation_profiles;
create policy tco_operation_profiles_select_own on public.tco_operation_profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists tco_operation_profiles_insert_own on public.tco_operation_profiles;
create policy tco_operation_profiles_insert_own on public.tco_operation_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists tco_operation_profiles_update_own on public.tco_operation_profiles;
create policy tco_operation_profiles_update_own on public.tco_operation_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists tco_operation_profiles_delete_own on public.tco_operation_profiles;
create policy tco_operation_profiles_delete_own on public.tco_operation_profiles for delete to authenticated using ((select auth.uid()) = user_id);

-- 생성·업로드 이미지 저장소(전용 공개 버킷 — Threads가 이미지 주소를 직접 가져가야 하므로 공개, 회원별 폴더만 올리기·삭제). v2.19부터 threads-content-ops-media.
insert into storage.buckets (id, name, public) values ('threads-content-ops-media', 'threads-content-ops-media', true) on conflict (id) do update set public = true;
drop policy if exists tco_media_insert_own on storage.objects;
create policy tco_media_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'threads-content-ops-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists tco_media_delete_own on storage.objects;
create policy tco_media_delete_own on storage.objects for delete to authenticated using (bucket_id = 'threads-content-ops-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- 끝. Table Editor 에 테이블이, Storage 에 버킷이 보이면 성공입니다.

-- 예약 발행 실행 연결(2026-10-19): 회원 본인 cron-job.org 작업용 회원 전용 토큰(해시만)·작업 번호·켜짐·일시정지. 지침: AIMaster docs/SCHEDULER_POLICY.md
create table if not exists public.tco_member_scheduler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  cronjob_job_id bigint,
  active boolean not null default false,
  paused boolean not null default false,
  mode text not null default 'cronjob' check (mode in ('vercel', 'cronjob')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- mode: 예약 발행 실행 방식(배포판 기본 cronjob = 회원 본인 cron-job.org, vercel = Vercel 예약 호출 — Pro에서 KIT/enable-vercel-cron 실행 후 선택)
alter table public.tco_member_scheduler add column if not exists mode text not null default 'cronjob';
alter table public.tco_member_scheduler enable row level security;
drop policy if exists tco_member_scheduler_select_own on public.tco_member_scheduler;
create policy tco_member_scheduler_select_own on public.tco_member_scheduler for select to authenticated using (auth.uid() = user_id);
