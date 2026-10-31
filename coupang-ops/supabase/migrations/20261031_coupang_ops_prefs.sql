-- AI 쿠팡 운영 자동화 — 회원 설정(답변 템플릿·등록 템플릿·원가·목표 이익률). 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth.
-- 회원 설정이라 30일 정리 대상이 아니다. 고객 정보는 넣지 않는다. 본인 행만(RLS).
create table if not exists public.coupang_ops_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.coupang_ops_prefs enable row level security;
drop policy if exists "coupang_ops_prefs_owner" on public.coupang_ops_prefs;
create policy "coupang_ops_prefs_owner" on public.coupang_ops_prefs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
