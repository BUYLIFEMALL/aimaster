-- =====================================================================
-- INSTA 포스팅 자동화 — 새 Supabase 프로젝트용 전체 스키마 (강의용 설치 키트, 2026-10-18)
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
insert into public.programs (slug, name, badges) values ('auto-instagram-posting', 'INSTA 포스팅 자동화', array['free']) on conflict (slug) do nothing;

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

-- ===================== INSTA 포스팅 자동화 전용 =====================
create table if not exists public.insta_accounts (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ig_user_id text not null,
  ig_username text,
  page_id text,
  access_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  auth_method text not null default 'facebook_login',
  constraint insta_accounts_user_unique unique (user_id),
  constraint insta_accounts_auth_method_check check (auth_method = any (array['facebook_login','instagram_login']::text[]))
);

create table if not exists public.insta_posts (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text not null,
  hashtags text[] not null default '{}'::text[],
  image_url text,
  status text not null default 'draft',
  scheduled_at timestamptz,
  ig_media_id text,
  ig_permalink text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  post_type text not null default 'feed',
  cover_image_url text,
  constraint insta_posts_post_type_check check (post_type = any (array['feed','card_news']::text[])),
  constraint insta_posts_status_check check (status = any (array['draft','scheduled','publishing','published','failed']::text[]))
);
create index if not exists insta_posts_scheduled_dispatch_idx on public.insta_posts (scheduled_at) where (status = 'scheduled');
create index if not exists insta_posts_user_status_idx on public.insta_posts (user_id, status);

create table if not exists public.insta_post_slides (
  id uuid not null default gen_random_uuid() primary key,
  post_id uuid not null references public.insta_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slide_order integer not null,
  source_paragraph text,
  image_prompt text,
  image_url text,
  image_urls text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insta_post_slides_order_unique unique (post_id, slide_order)
);
create index if not exists insta_post_slides_post_order_idx on public.insta_post_slides (post_id, slide_order);

create table if not exists public.insta_candidates (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_input text not null,
  title text not null,
  caption text not null,
  hashtags text[] not null default '{}'::text[],
  keywords text[] not null default '{}'::text[],
  status text not null default 'collected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insta_candidates_source_type_check check (source_type = any (array['http','rss','perplexity']::text[])),
  constraint insta_candidates_status_check check (status = any (array['collected','used']::text[]))
);
create index if not exists insta_candidates_user_created_idx on public.insta_candidates (user_id, created_at desc);

create table if not exists public.newsblur_accounts (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  password text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.insta_accounts enable row level security;
drop policy if exists insta_accounts_select_own on public.insta_accounts;
create policy insta_accounts_select_own on public.insta_accounts for select to public using (auth.uid() = user_id);
drop policy if exists insta_accounts_insert_own on public.insta_accounts;
create policy insta_accounts_insert_own on public.insta_accounts for insert to public with check (auth.uid() = user_id);
drop policy if exists insta_accounts_update_own on public.insta_accounts;
create policy insta_accounts_update_own on public.insta_accounts for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists insta_accounts_delete_own on public.insta_accounts;
create policy insta_accounts_delete_own on public.insta_accounts for delete to public using (auth.uid() = user_id);
alter table public.insta_posts enable row level security;
drop policy if exists insta_posts_select_own on public.insta_posts;
create policy insta_posts_select_own on public.insta_posts for select to public using (auth.uid() = user_id);
drop policy if exists insta_posts_insert_own on public.insta_posts;
create policy insta_posts_insert_own on public.insta_posts for insert to public with check (auth.uid() = user_id);
drop policy if exists insta_posts_update_own on public.insta_posts;
create policy insta_posts_update_own on public.insta_posts for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists insta_posts_delete_own on public.insta_posts;
create policy insta_posts_delete_own on public.insta_posts for delete to public using (auth.uid() = user_id);
alter table public.insta_post_slides enable row level security;
drop policy if exists insta_post_slides_select_own on public.insta_post_slides;
create policy insta_post_slides_select_own on public.insta_post_slides for select to public using (auth.uid() = user_id);
drop policy if exists insta_post_slides_insert_own on public.insta_post_slides;
create policy insta_post_slides_insert_own on public.insta_post_slides for insert to public with check (auth.uid() = user_id);
drop policy if exists insta_post_slides_update_own on public.insta_post_slides;
create policy insta_post_slides_update_own on public.insta_post_slides for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists insta_post_slides_delete_own on public.insta_post_slides;
create policy insta_post_slides_delete_own on public.insta_post_slides for delete to public using (auth.uid() = user_id);
alter table public.insta_candidates enable row level security;
drop policy if exists insta_candidates_select_own on public.insta_candidates;
create policy insta_candidates_select_own on public.insta_candidates for select to public using (auth.uid() = user_id);
drop policy if exists insta_candidates_insert_own on public.insta_candidates;
create policy insta_candidates_insert_own on public.insta_candidates for insert to public with check (auth.uid() = user_id);
drop policy if exists insta_candidates_update_own on public.insta_candidates;
create policy insta_candidates_update_own on public.insta_candidates for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists insta_candidates_delete_own on public.insta_candidates;
create policy insta_candidates_delete_own on public.insta_candidates for delete to public using (auth.uid() = user_id);
alter table public.newsblur_accounts enable row level security;
drop policy if exists newsblur_accounts_select_own on public.newsblur_accounts;
create policy newsblur_accounts_select_own on public.newsblur_accounts for select to public using (auth.uid() = user_id);
drop policy if exists newsblur_accounts_insert_own on public.newsblur_accounts;
create policy newsblur_accounts_insert_own on public.newsblur_accounts for insert to public with check (auth.uid() = user_id);
drop policy if exists newsblur_accounts_update_own on public.newsblur_accounts;
create policy newsblur_accounts_update_own on public.newsblur_accounts for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists newsblur_accounts_delete_own on public.newsblur_accounts;
create policy newsblur_accounts_delete_own on public.newsblur_accounts for delete to public using (auth.uid() = user_id);
drop trigger if exists insta_accounts_set_updated_at on public.insta_accounts;
create trigger insta_accounts_set_updated_at before update on public.insta_accounts for each row execute function public.set_updated_at();
drop trigger if exists insta_posts_set_updated_at on public.insta_posts;
create trigger insta_posts_set_updated_at before update on public.insta_posts for each row execute function public.set_updated_at();
drop trigger if exists insta_post_slides_set_updated_at on public.insta_post_slides;
create trigger insta_post_slides_set_updated_at before update on public.insta_post_slides for each row execute function public.set_updated_at();
drop trigger if exists insta_candidates_set_updated_at on public.insta_candidates;
create trigger insta_candidates_set_updated_at before update on public.insta_candidates for each row execute function public.set_updated_at();

-- 게시 이미지 저장소(공개 버킷 — Instagram이 이미지 주소를 직접 가져가야 하므로 공개, 회원별 폴더만 쓰기·삭제)
insert into storage.buckets (id, name, public) values ('insta-post-images', 'insta-post-images', true) on conflict (id) do nothing;
drop policy if exists insta_post_images_select_public on storage.objects;
create policy insta_post_images_select_public on storage.objects for select to public using (bucket_id = 'insta-post-images');
drop policy if exists insta_post_images_insert_own on storage.objects;
create policy insta_post_images_insert_own on storage.objects for insert to public with check (bucket_id = 'insta-post-images' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists insta_post_images_update_own on storage.objects;
create policy insta_post_images_update_own on storage.objects for update to public using (bucket_id = 'insta-post-images' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists insta_post_images_delete_own on storage.objects;
create policy insta_post_images_delete_own on storage.objects for delete to public using (bucket_id = 'insta-post-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- 끝. Table Editor 에 테이블이, Storage 에 버킷이 보이면 성공입니다.

-- 예약 발행 실행 연결(2026-10-19): 회원 본인 cron-job.org 작업용 회원 전용 토큰(해시만)·작업 번호·켜짐·일시정지·실행 방식. 지침: AIMaster docs/SCHEDULER_POLICY.md
-- mode: 배포판 기본 cronjob(회원 본인 cron-job.org), vercel = Vercel 예약 호출(Pro에서 KIT/enable-vercel-cron 실행 후 선택)
create table if not exists public.insta_member_scheduler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'cronjob' check (mode in ('vercel', 'cronjob')),
  token_hash text not null unique,
  cronjob_job_id bigint,
  active boolean not null default false,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.insta_member_scheduler enable row level security;
drop policy if exists insta_member_scheduler_select_own on public.insta_member_scheduler;
create policy insta_member_scheduler_select_own on public.insta_member_scheduler for select to authenticated using (auth.uid() = user_id);
