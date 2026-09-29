-- Standalone clone of Threads Affiliate Poster — step 1 of 3.
-- Run this in the NEW Supabase project's SQL Editor BEFORE supabase/migrations/0001~0007.
--
-- In AIMaster these tables are shared by every program and are created by the root app.
-- A standalone copy has no AIMaster, so this file creates the minimum the program reads:
-- login profile, grade, program row, subscription/grant, API keys, usage log, and the
-- optional detail_pages table (read-only reference from the detail-page program).
-- Payment (Payapp), affiliates, admin screens and catalog tables are intentionally left out.

create extension if not exists pgcrypto;

-- Member grade. The program only reads sort_order.
create table if not exists public.member_grades (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table public.member_grades enable row level security;
create policy grades_select_all on public.member_grades for select using (true);

insert into public.member_grades (name, slug, sort_order)
values ('일반', 'basic', 1)
on conflict (slug) do nothing;

-- One row per signed-up user (filled by the trigger below).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  grade_id uuid references public.member_grades(id),
  is_admin boolean default false,
  is_suspended boolean not null default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, grade_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    (select id from public.member_grades where slug = 'basic')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The program row the access check looks up by slug.
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean default true,
  required_grade_id uuid references public.member_grades(id),
  version text not null default 'v1.01',
  created_at timestamptz default now()
);
alter table public.programs enable row level security;
create policy programs_select_active on public.programs for select using (is_active = true);

-- required_grade_id = null means every signed-in, non-suspended user may use the program.
-- Set it to a grade id (or use subscriptions / user_program_access) to restrict access.
insert into public.programs (name, slug, required_grade_id)
values ('Threads 쇼핑제휴 자동화', 'threads-affiliate-poster', null)
on conflict (slug) do nothing;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  status text,
  started_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table public.subscriptions enable row level security;
create policy subscriptions_select_own on public.subscriptions for select using (auth.uid() = user_id);

-- Manual grants. Only the owner may read their own rows; writes go through the service role
-- (Supabase dashboard / SQL). Do NOT add a "using (true)" policy here — that lets any user grant themselves access.
create table if not exists public.user_program_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  granted_at timestamptz default now(),
  expires_at timestamptz
);
alter table public.user_program_access enable row level security;
create policy user_program_access_select_own on public.user_program_access for select using (auth.uid() = user_id);

-- Each member's own keys (BYOK). The provider list is finalized in 99_finalize.sql.
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_api_keys_user_provider_unique unique (user_id, provider)
);
alter table public.user_api_keys enable row level security;
create policy user_api_keys_select_own on public.user_api_keys for select using (auth.uid() = user_id);
create policy user_api_keys_insert_own on public.user_api_keys for insert with check (auth.uid() = user_id);
create policy user_api_keys_update_own on public.user_api_keys for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_api_keys_delete_own on public.user_api_keys for delete using (auth.uid() = user_id);

-- Cost-bearing action log (written with the service role only).
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  action text not null,
  quantity integer not null default 1,
  credits_used numeric not null default 0,
  metadata jsonb,
  created_at timestamptz default now()
);
alter table public.usage_logs enable row level security;
create policy usage_logs_select_own on public.usage_logs for select using (auth.uid() = user_id);

-- Optional: in AIMaster the detail-page program writes here and this program only reads it.
-- Kept empty so the "상품정보+상세페이지 직접 입력" screen works without that program.
create table if not exists public.detail_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template text not null default '',
  product_name text not null,
  html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.detail_pages enable row level security;
create policy detail_pages_select_own on public.detail_pages for select using (auth.uid() = user_id);
