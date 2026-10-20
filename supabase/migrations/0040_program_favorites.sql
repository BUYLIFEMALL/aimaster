-- 2026-10-20 메인 사이트 「내 작업대」 즐겨찾기를 회원별 DB에 저장(어느 기기·브라우저에서나 같은 목록)
-- seen_version: 회원이 이 프로그램을 마지막으로 열었을(또는 고정했을) 때의 programs.version — 다르면 「새 버전」 알림 점
create table if not exists public.program_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  seen_version text,
  created_at timestamptz not null default now(),
  primary key (user_id, program_id)
);

alter table public.program_favorites enable row level security;

drop policy if exists "program_favorites_select_own" on public.program_favorites;
create policy "program_favorites_select_own" on public.program_favorites for select using (auth.uid() = user_id);
drop policy if exists "program_favorites_insert_own" on public.program_favorites;
create policy "program_favorites_insert_own" on public.program_favorites for insert with check (auth.uid() = user_id);
drop policy if exists "program_favorites_update_own" on public.program_favorites;
create policy "program_favorites_update_own" on public.program_favorites for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "program_favorites_delete_own" on public.program_favorites;
create policy "program_favorites_delete_own" on public.program_favorites for delete using (auth.uid() = user_id);
