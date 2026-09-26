create table if not exists public.naver_blog_seo_title_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 300),
  keywords text not null default '',
  titles jsonb not null default '[]'::jsonb,
  selected_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists naver_blog_seo_title_recommendations_user_updated_idx
  on public.naver_blog_seo_title_recommendations (user_id, updated_at desc);

alter table public.naver_blog_seo_title_recommendations enable row level security;

drop policy if exists "seo title recommendations owner select" on public.naver_blog_seo_title_recommendations;
create policy "seo title recommendations owner select"
  on public.naver_blog_seo_title_recommendations for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "seo title recommendations owner insert" on public.naver_blog_seo_title_recommendations;
create policy "seo title recommendations owner insert"
  on public.naver_blog_seo_title_recommendations for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "seo title recommendations owner update" on public.naver_blog_seo_title_recommendations;
create policy "seo title recommendations owner update"
  on public.naver_blog_seo_title_recommendations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "seo title recommendations owner delete" on public.naver_blog_seo_title_recommendations;
create policy "seo title recommendations owner delete"
  on public.naver_blog_seo_title_recommendations for delete to authenticated
  using ((select auth.uid()) = user_id);
