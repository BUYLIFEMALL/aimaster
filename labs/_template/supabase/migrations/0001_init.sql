-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용한다. 테이블 이름은 모두 이름표 "__LAB_PREFIX___"로 시작한다.
-- 먼저 Lab 등록부에 등록해야 이 이름표로 테이블을 만들 수 있다(labs/_platform/migrations/0001_lab_admin.sql).
select lab_admin.register_program('__LAB_NAME__');

create table if not exists public.__LAB_PREFIX___notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.__LAB_PREFIX___notes enable row level security;

create policy "__LAB_PREFIX___notes_owner" on public.__LAB_PREFIX___notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
