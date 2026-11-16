-- =====================================================================
-- Threads 포스팅 자동화 — 새 Supabase 프로젝트용 전체 스키마 (수강생 배포 키트, 2026-11-16)
-- 사용법: Supabase 대시보드 → SQL Editor → New query → 이 파일 전체를 붙여넣고 Run.
-- ⚠ 반드시 「빈 새 프로젝트」에서 실행합니다. 다른 프로그램이 쓰던 기존 프로젝트에는 실행하지 마세요(같은 이름의 표가 있으면 오류·충돌).
-- 데이터는 한 줄도 들어 있지 않고 구조(표·제약·인덱스·보안 정책·이미지 버킷)만 만듭니다.
-- 다시 실행해도 대부분 건너뛰도록 if not exists / drop if exists 를 썼습니다.
-- =====================================================================

-- 공통: updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 회원 본인 API 키(OpenAI·Gemini·Perplexity·Threads 앱 ID/시크릿·cron-job.org·무료 사진). 본인 것만 읽고 쓸 수 있습니다.
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_api_keys_user_provider_unique unique (user_id, provider),
  constraint user_api_keys_provider_check check (provider = any (array[
    'openai','gemini','perplexity','threads_app_id','threads_app_secret','cronjob_org_api_key','pixabay','pexels'
  ]))
);

-- 연결한 Threads 계정(회원당 1개). 토큰은 서버에서만 읽습니다.
create table if not exists public.threads_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  threads_user_id text not null,
  username text,
  access_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint threads_accounts_user_unique unique (user_id)
);

-- 게시글(초안·예약·게시 완료·실패)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  image_url text,
  video_filename text,
  status text not null default 'draft' check (status in ('draft','scheduled','publishing','published','failed')),
  scheduled_at timestamptz,
  threads_post_id text,
  threads_permalink text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_user_status_idx on public.posts (user_id, status);
create index if not exists posts_scheduled_dispatch_idx on public.posts (scheduled_at) where status = 'scheduled';

-- 글감 분류(회원별)
create table if not exists public.threads_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 수집한 글감
create table if not exists public.threads_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('http','rss','perplexity')),
  source_input text not null,
  title text not null,
  content text not null,
  keywords text[] not null default '{}'::text[],
  status text not null default 'collected' check (status in ('collected','used')),
  category_id uuid references public.threads_categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists threads_candidates_user_id_idx on public.threads_candidates (user_id);

-- (선택) NewsBlur RSS 계정
create table if not exists public.newsblur_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  password text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at 자동 갱신 연결
do $$
declare t text;
begin
  foreach t in array array['user_api_keys','threads_accounts','posts','threads_candidates','newsblur_accounts'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- 보안 정책: 모든 표는 「본인 데이터만」 읽고 쓴다
do $$
declare t text;
begin
  foreach t in array array['user_api_keys','threads_accounts','posts','threads_categories','threads_candidates','newsblur_accounts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format('create policy %I_own on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- 글 첨부 이미지 저장소(공개 읽기, 쓰기·삭제는 본인 폴더 「<회원 id>/…」만)
insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true) on conflict (id) do nothing;
drop policy if exists post_images_select_public on storage.objects;
create policy post_images_select_public on storage.objects for select to public using (bucket_id = 'post-images');
drop policy if exists post_images_insert_own on storage.objects;
create policy post_images_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'post-images' and (auth.uid())::text = (storage.foldername(name))[1]);
drop policy if exists post_images_update_own on storage.objects;
create policy post_images_update_own on storage.objects for update to authenticated using (bucket_id = 'post-images' and (auth.uid())::text = (storage.foldername(name))[1]);
drop policy if exists post_images_delete_own on storage.objects;
create policy post_images_delete_own on storage.objects for delete to authenticated using (bucket_id = 'post-images' and (auth.uid())::text = (storage.foldername(name))[1]);

-- 예약 발행 실행 방식(회원 본인 cron-job.org). 맨 마지막에 만드는 표 — 패키지 설치마법사가 이 표로 실행 성공을 확인합니다.
create table if not exists public.atp_member_scheduler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'cronjob' check (mode in ('vercel','cronjob')),
  token_hash text not null unique,
  cronjob_job_id bigint,
  active boolean not null default false,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.atp_member_scheduler enable row level security;
drop policy if exists atp_member_scheduler_select_own on public.atp_member_scheduler;
create policy atp_member_scheduler_select_own on public.atp_member_scheduler for select to authenticated using (auth.uid() = user_id);
grant select on public.atp_member_scheduler to authenticated;
drop trigger if exists atp_member_scheduler_set_updated_at on public.atp_member_scheduler;
create trigger atp_member_scheduler_set_updated_at before update on public.atp_member_scheduler for each row execute function public.set_updated_at();
