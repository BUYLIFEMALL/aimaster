-- 네이버 블로그 SEO 스튜디오 v1.93 (2026-10-22, BLC-09): 구간별로 쓰기 — 승인 자료로 만든 목차와 구간별 본문·상태(중지·실패해도 쓴 구간 보존).
-- 모든 구간이 끝나면 naver_blog_seo_drafts에 하나의 원고로 합치고 draft_id·joined_hash(합칠 때 구간 지문)를 남긴다. 30일 자동 정리(lib/draftRetention.ts).
create table if not exists public.naver_blog_seo_outlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  research_id uuid not null references public.naver_blog_seo_research(id) on delete cascade,
  style_id uuid references public.naver_blog_seo_styles(id) on delete set null,
  keyword text not null check (char_length(keyword) between 1 and 100),
  title text not null check (char_length(title) between 1 and 150),
  titles jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  status text not null default 'outline' check (status in ('outline', 'writing', 'written', 'joined')),
  draft_id uuid references public.naver_blog_seo_drafts(id) on delete set null,
  joined_hash text,
  strategy text not null,
  persona_id text,
  custom_persona text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists naver_blog_seo_outlines_user_created_idx on public.naver_blog_seo_outlines (user_id, created_at desc);
create index if not exists naver_blog_seo_outlines_research_idx on public.naver_blog_seo_outlines (research_id);
alter table public.naver_blog_seo_outlines enable row level security;
create policy "seo_outlines_select_own" on public.naver_blog_seo_outlines for select to authenticated using (auth.uid() = user_id);
create policy "seo_outlines_insert_own" on public.naver_blog_seo_outlines for insert to authenticated with check (auth.uid() = user_id);
create policy "seo_outlines_update_own" on public.naver_blog_seo_outlines for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "seo_outlines_delete_own" on public.naver_blog_seo_outlines for delete to authenticated using (auth.uid() = user_id);
