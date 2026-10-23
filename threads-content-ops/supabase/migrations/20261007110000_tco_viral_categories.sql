-- v1.66 떡상 콘텐츠 수집(글감) 카테고리. naver-blog-agent 글감 수집소의 카테고리 등록·수정·이동 기능을 확장 이식.
-- 카테고리를 지우면 그 글감은 category_id가 null(= 미분류)이 된다. 회원별 owner-only RLS.

create table if not exists public.tco_viral_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists tco_viral_categories_user_name_idx
  on public.tco_viral_categories(user_id, lower(name));

alter table public.tco_viral_categories enable row level security;
revoke all on table public.tco_viral_categories from anon, authenticated;
grant select, insert, update, delete on table public.tco_viral_categories to authenticated;

create policy "tco_viral_categories_select_own" on public.tco_viral_categories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "tco_viral_categories_insert_own" on public.tco_viral_categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "tco_viral_categories_update_own" on public.tco_viral_categories
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tco_viral_categories_delete_own" on public.tco_viral_categories
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.tco_viral_candidates
  add column if not exists category_id uuid references public.tco_viral_categories(id) on delete set null;
create index if not exists tco_viral_candidates_category_idx on public.tco_viral_candidates(user_id, category_id);
