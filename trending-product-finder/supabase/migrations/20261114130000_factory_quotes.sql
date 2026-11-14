-- EC-W10 해외 공장 견적 비교 (2026-11-14, [역할: ecommerce-image] claude-win-sdp, 주인님 「진행해」 — 플랜 추천안)
-- 플랜: trending-product-finder/docs/PLAN_20261114_EC_W10_FACTORY_QUOTES.md
-- 원본 파일은 저장하지 않는다(안 A). 회원이 붙여 넣은 글·파일 이름 목록·AI 결과만 회원별로 저장하고 30일 뒤 정리(cleanup-generated, 예외 회원 제외).

create table if not exists public.factory_quote_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  pasted_text text not null default '' check (char_length(pasted_text) <= 30000),
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.factory_quote_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.factory_quote_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  report jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists factory_quote_projects_user_idx on public.factory_quote_projects (user_id, updated_at desc);
create index if not exists factory_quote_reports_project_idx on public.factory_quote_reports (project_id, created_at desc);

alter table public.factory_quote_projects enable row level security;
alter table public.factory_quote_reports enable row level security;

drop policy if exists factory_quote_projects_owner on public.factory_quote_projects;
create policy factory_quote_projects_owner on public.factory_quote_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists factory_quote_reports_owner on public.factory_quote_reports;
create policy factory_quote_reports_owner on public.factory_quote_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 되돌리기: drop table if exists public.factory_quote_reports; drop table if exists public.factory_quote_projects;
