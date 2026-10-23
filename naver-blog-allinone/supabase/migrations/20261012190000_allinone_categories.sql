-- 네이버 블로그 올인원 v1.24 (2026-10-12): 회원별 글 카테고리. 아이디어·키워드·맛집 탭과 보관함이 같은 목록을 쓴다(RLS owner-only).
create table if not exists public.aio_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  slug text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.aio_categories enable row level security;
create policy "aio_categories_select_own" on public.aio_categories for select to authenticated using (auth.uid() = user_id);
create policy "aio_categories_insert_own" on public.aio_categories for insert to authenticated with check (auth.uid() = user_id);
create policy "aio_categories_update_own" on public.aio_categories for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "aio_categories_delete_own" on public.aio_categories for delete to authenticated using (auth.uid() = user_id);
