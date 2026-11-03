-- B2 주소 리포트 저장(2026-11-03, v1.43, 플랜 docs/PLAN_20261102_B_ADDRESS_REPORT.md B2)
-- 회원이 「💾 저장」한 리포트 숫자·호가·AI 총평. 회원 본인만(RLS). 보관 1년(관리자 지정 real-estate-sales, 정리: /api/cron/cleanup-sentiment)
create table if not exists public.real_estate_saved_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pnu text not null check (pnu ~ '^[0-9]{19}$'),
  source text not null check (source in ('listing', 'onsite')),
  source_id text,
  title text not null check (char_length(title) <= 200),
  subtitle text check (subtitle is null or char_length(subtitle) <= 300),
  report jsonb not null,
  asking_price integer check (asking_price is null or (asking_price > 0 and asking_price < 10000000)), -- 만 원
  ai_summary text,
  ai_model text,
  ai_requested_at timestamptz, -- 같은 리포트 AI 총평 1분 안 다시 부르기 막기(회원 키 이중 과금 방지)
  created_at timestamptz not null default now()
);

create index if not exists real_estate_saved_reports_user_created_idx
  on public.real_estate_saved_reports (user_id, created_at desc);

alter table public.real_estate_saved_reports enable row level security;

drop policy if exists "saved reports select own" on public.real_estate_saved_reports;
create policy "saved reports select own" on public.real_estate_saved_reports
  for select using (auth.uid() = user_id);
drop policy if exists "saved reports insert own" on public.real_estate_saved_reports;
create policy "saved reports insert own" on public.real_estate_saved_reports
  for insert with check (auth.uid() = user_id);
drop policy if exists "saved reports update own" on public.real_estate_saved_reports;
create policy "saved reports update own" on public.real_estate_saved_reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "saved reports delete own" on public.real_estate_saved_reports;
create policy "saved reports delete own" on public.real_estate_saved_reports
  for delete using (auth.uid() = user_id);
