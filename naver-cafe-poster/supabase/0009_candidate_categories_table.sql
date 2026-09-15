-- 0008에서 만들었던 자유 입력 텍스트 category 컬럼 방식을 폐기하고, 회원이 직접 등록·수정·
-- 삭제하는 정식 카테고리 테이블로 교체한다(사용자 지시, 2026-09-15 — "카테고리 필터 대신
-- 카테고리 등록/수정/삭제 기능을 추가"). 글감 수집 시 어느 카테고리에 넣을지 선택하고, 기존
-- 후보도 원하는 카테고리로 이동시켜 관리할 수 있게 한다.
create table if not exists public.ncafe_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists ncafe_categories_user_idx on public.ncafe_categories (user_id, created_at);

alter table public.ncafe_categories enable row level security;

create policy "ncafe_categories_select_own" on public.ncafe_categories
  for select using (auth.uid() = user_id);
create policy "ncafe_categories_insert_own" on public.ncafe_categories
  for insert with check (auth.uid() = user_id);
create policy "ncafe_categories_update_own" on public.ncafe_categories
  for update using (auth.uid() = user_id);
create policy "ncafe_categories_delete_own" on public.ncafe_categories
  for delete using (auth.uid() = user_id);

-- 자유 입력 텍스트 category 컬럼을 제거하고, 카테고리 테이블을 참조하는 category_id로 교체한다.
-- 카테고리가 삭제되면 그 카테고리를 쓰던 후보는 "카테고리 없음"(null)으로 돌아간다.
alter table public.ncafe_candidates drop column if exists category;
alter table public.ncafe_candidates
  add column if not exists category_id uuid references public.ncafe_categories (id) on delete set null;

create index if not exists ncafe_candidates_category_idx on public.ncafe_candidates (category_id);
