-- 네이버 블로그 SEO 스튜디오 v1.62 (2026-10-12): 회원별 보관함 분류 + 글(초안)별 분류·네이버 실제 카테고리.
create table if not exists public.naver_blog_seo_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  slug text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.naver_blog_seo_categories enable row level security;
create policy "seo_categories_select_own" on public.naver_blog_seo_categories for select to authenticated using (auth.uid() = user_id);
create policy "seo_categories_insert_own" on public.naver_blog_seo_categories for insert to authenticated with check (auth.uid() = user_id);
create policy "seo_categories_update_own" on public.naver_blog_seo_categories for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "seo_categories_delete_own" on public.naver_blog_seo_categories for delete to authenticated using (auth.uid() = user_id);
alter table public.naver_blog_seo_drafts
  add column if not exists category_id text,
  add column if not exists naver_category jsonb;
