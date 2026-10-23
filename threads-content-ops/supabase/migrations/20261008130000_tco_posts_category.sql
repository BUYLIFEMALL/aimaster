-- v1.75: 콘텐츠 보관함 글에 글감과 같은 카테고리를 지정한다(카테고리를 지우면 미분류).
alter table public.tco_posts add column if not exists category_id uuid references public.tco_viral_categories(id) on delete set null;
create index if not exists tco_posts_user_category_idx on public.tco_posts (user_id, category_id);
