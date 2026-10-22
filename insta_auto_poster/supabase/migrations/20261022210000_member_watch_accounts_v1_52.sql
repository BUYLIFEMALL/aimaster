-- INSTA v1.52 (2026-10-22): 회원별 경쟁 계정 즐겨찾기(공용 — 다른 프로그램도 platform으로 재사용). 계정 이름만 저장, 본인만 읽기·쓰기.
-- [운영 DB에 2026-10-22 주인님 승인(「B. 회원별 DB 표」) 후 크롬 Supabase SQL 편집기로 실행함 — 결과 rows 0 · policies 3 · rls true]
create table if not exists public.member_watch_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'instagram' check (platform in ('instagram','threads','youtube','tiktok')),
  handle text not null check (char_length(handle) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, platform, handle)
);
create index if not exists member_watch_accounts_user_idx on public.member_watch_accounts (user_id, platform, created_at desc);
alter table public.member_watch_accounts enable row level security;
drop policy if exists "member_watch_accounts owner select" on public.member_watch_accounts;
drop policy if exists "member_watch_accounts owner insert" on public.member_watch_accounts;
drop policy if exists "member_watch_accounts owner delete" on public.member_watch_accounts;
create policy "member_watch_accounts owner select" on public.member_watch_accounts for select to authenticated using (auth.uid() = user_id);
create policy "member_watch_accounts owner insert" on public.member_watch_accounts for insert to authenticated with check (auth.uid() = user_id);
create policy "member_watch_accounts owner delete" on public.member_watch_accounts for delete to authenticated using (auth.uid() = user_id);

update public.programs set version='v1.52', updated_at=now() where slug='auto-instagram-posting';
