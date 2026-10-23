-- 2026-10-12: 프로그램 추천(♥) 투표 + 추천 뱃지(메인 사이트 '이달의 무료 프로그램'·'추천 프로그램' 섹션)
alter table public.programs drop constraint if exists programs_badges_check;
alter table public.programs add constraint programs_badges_check check (badges <@ array['new','best','sale','coming','free','recommended']::text[]);
alter table public.programs add column if not exists like_count integer not null default 0;

create table if not exists public.program_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, program_id)
);
create index if not exists program_likes_program_idx on public.program_likes (program_id);
alter table public.program_likes enable row level security;
create policy "program_likes_select_own" on public.program_likes for select to authenticated using (auth.uid() = user_id);
create policy "program_likes_insert_own" on public.program_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "program_likes_delete_own" on public.program_likes for delete to authenticated using (auth.uid() = user_id);

create or replace function public.sync_program_like_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.programs set like_count = like_count + 1 where id = new.program_id;
  elsif tg_op = 'DELETE' then
    update public.programs set like_count = greatest(like_count - 1, 0) where id = old.program_id;
  end if;
  return null;
end $$;
drop trigger if exists program_likes_count_trg on public.program_likes;
create trigger program_likes_count_trg after insert or delete on public.program_likes
  for each row execute function public.sync_program_like_count();
