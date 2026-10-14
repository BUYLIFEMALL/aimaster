-- AI 종합 성격 진단 자동화 (slug: personality-suite) — 검사 결과·종합 프로필 테이블 (v1.01, 2026-10-14)
-- 공용 Supabase(AIMaster) 한 곳을 쓴다. 회원 본인 결과만 읽고 쓸 수 있다(RLS owner-only).
-- 서버는 service role로 접근하며 모든 쿼리에서 user_id로 직접 거른다. 회원당 결과는 최대 100개까지 서버가 정리한다.
-- API 키는 공용 user_api_keys의 기존 provider(gemini)를 그대로 쓴다 — 제약 변경 없음.

create table if not exists public.personality_suite_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null,
  code text not null,
  headline text not null,
  result jsonb not null,
  answers jsonb not null,
  analysis jsonb,
  created_at timestamptz not null default now()
);

create index if not exists personality_suite_results_user_created_idx
  on public.personality_suite_results (user_id, created_at desc);

alter table public.personality_suite_results enable row level security;

create policy "personality_suite_results_owner_all" on public.personality_suite_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.personality_suite_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null,
  based_on jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.personality_suite_profiles enable row level security;

create policy "personality_suite_profiles_owner_all" on public.personality_suite_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
