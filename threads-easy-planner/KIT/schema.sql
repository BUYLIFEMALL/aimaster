-- =====================================================================
-- Threads AI 기획 자동화 — 새 Supabase 프로젝트용 전체 스키마 (수강생 배포 키트, 2026-10-23)
-- 사용법: 패키지 설치마법사가 이 파일을 클립보드에 복사해 줍니다.
--         Supabase 대시보드 → SQL Editor → 빈 칸 클릭 → 붙여넣기 → Run.
-- 빈 새 프로젝트에서 실행합니다. 다시 실행해도 안전하도록 if not exists / drop if exists 를 썼습니다.
-- ('Potential issue detected' 경고가 뜨면 Run query 를 누르면 됩니다 — 새 프로젝트라 안전)
-- 데이터는 들어 있지 않고 구조(테이블·보안 정책)만 만듭니다.
-- =====================================================================

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

-- 이용 권한 관련 빈 테이블(코드 호환용 — 독립 운영 모드에서는 판정에 쓰이지 않고, 로그인한 본인은 바로 사용합니다)
create table if not exists public.member_grades (id uuid primary key default gen_random_uuid(), name text, sort_order int not null default 0);
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  is_active boolean not null default true,
  badges text[] not null default '{}'::text[],
  required_grade_id uuid references public.member_grades(id),
  version text,
  created_at timestamptz not null default now()
);
create table if not exists public.subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, program_id uuid references public.programs(id) on delete cascade, status text, expires_at timestamptz);
create table if not exists public.user_program_access (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, program_id uuid references public.programs(id) on delete cascade, expires_at timestamptz);
alter table public.member_grades enable row level security;
alter table public.programs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_program_access enable row level security;
insert into public.programs (slug, name, badges) values ('threads-easy-planner', 'Threads AI 기획 자동화', array['free']) on conflict (slug) do nothing;

-- 회원 본인 AI 키(OpenAI·Gemini·Claude). 본인 것만 읽고 쓸 수 있습니다(서버는 서비스 키로 본인 user_id만 조회).
create table if not exists public.user_api_keys (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_api_keys_user_provider_unique unique (user_id, provider),
  constraint user_api_keys_provider_check check (provider = any (array['openai','gemini','anthropic']::text[]))
);
alter table public.user_api_keys enable row level security;
drop policy if exists user_api_keys_select_own on public.user_api_keys;
create policy user_api_keys_select_own on public.user_api_keys for select to authenticated using (auth.uid() = user_id);
drop policy if exists user_api_keys_insert_own on public.user_api_keys;
create policy user_api_keys_insert_own on public.user_api_keys for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists user_api_keys_update_own on public.user_api_keys;
create policy user_api_keys_update_own on public.user_api_keys for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists user_api_keys_delete_own on public.user_api_keys;
create policy user_api_keys_delete_own on public.user_api_keys for delete to authenticated using (auth.uid() = user_id);
drop trigger if exists user_api_keys_set_updated_at on public.user_api_keys;
create trigger user_api_keys_set_updated_at before update on public.user_api_keys for each row execute function public.set_updated_at();

-- ===================== Threads AI 기획 자동화 전용 =====================
-- 콘텐츠 보관함(저장한 글). 회원 본인 것만 보이고, 30일 지난 글은 보관함을 열 때 자동으로 지워집니다.
create table if not exists public.tep_saved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  hook text not null,
  hook_reason text default '',
  hook_variants jsonb default '[]'::jsonb,
  body_text text not null,
  reply_cta text default '',
  follow_up_topics jsonb default '[]'::jsonb,
  persona_id text,
  persona_name text,
  model_label text,
  image_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tep_saved_plans enable row level security;
drop policy if exists tep_saved_plans_select_own on public.tep_saved_plans;
create policy tep_saved_plans_select_own on public.tep_saved_plans for select to authenticated using (auth.uid() = user_id);
drop policy if exists tep_saved_plans_insert_own on public.tep_saved_plans;
create policy tep_saved_plans_insert_own on public.tep_saved_plans for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists tep_saved_plans_update_own on public.tep_saved_plans;
create policy tep_saved_plans_update_own on public.tep_saved_plans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists tep_saved_plans_delete_own on public.tep_saved_plans;
create policy tep_saved_plans_delete_own on public.tep_saved_plans for delete to authenticated using (auth.uid() = user_id);
create index if not exists idx_tep_saved_plans_user_created on public.tep_saved_plans (user_id, created_at desc);
drop trigger if exists tep_saved_plans_set_updated_at on public.tep_saved_plans;
create trigger tep_saved_plans_set_updated_at before update on public.tep_saved_plans for each row execute function public.set_updated_at();

-- 예전 버전 DB에 다시 실행해도 이미지 칸이 생기게(배포판 v1.02~)
alter table public.tep_saved_plans add column if not exists image_urls jsonb not null default '[]'::jsonb;

-- 글과 함께 만든 이미지 저장 공간(공개 읽기, 올리기는 서버만). 경로 「<회원 id>/<파일>」, 30일 지나면 보관함을 열 때 자동 삭제
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tep-images', 'tep-images', true, 12582912, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- 끝. 마법사는 마지막에 만들어지는 tep_saved_plans 표로 설치 성공을 확인합니다.
