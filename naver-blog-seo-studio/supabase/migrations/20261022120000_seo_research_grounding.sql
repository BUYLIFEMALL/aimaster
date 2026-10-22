-- 네이버 블로그 SEO 스튜디오 v1.84 (2026-10-22, BLC-08a): 「자료부터 집필」 — 회원별 자료·근거·승인 기록.
-- 승인(approved_at·approval_hash)은 서버 API만 기록하고, 생성 때 지문을 다시 확인한다. 30일 자동 정리(lib/draftRetention.ts).
create table if not exists public.naver_blog_seo_research (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  keyword text not null check (char_length(keyword) between 1 and 60),
  sources jsonb not null default '[]'::jsonb,
  points jsonb not null default '[]'::jsonb,
  angle text,
  approved_at timestamptz,
  approval_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists naver_blog_seo_research_user_created_idx on public.naver_blog_seo_research (user_id, created_at desc);
alter table public.naver_blog_seo_research enable row level security;
create policy "seo_research_select_own" on public.naver_blog_seo_research for select to authenticated using (auth.uid() = user_id);
create policy "seo_research_insert_own" on public.naver_blog_seo_research for insert to authenticated with check (auth.uid() = user_id);
create policy "seo_research_update_own" on public.naver_blog_seo_research for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "seo_research_delete_own" on public.naver_blog_seo_research for delete to authenticated using (auth.uid() = user_id);
