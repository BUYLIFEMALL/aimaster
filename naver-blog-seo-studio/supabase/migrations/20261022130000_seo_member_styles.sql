-- 네이버 블로그 SEO 스튜디오 v1.85 (2026-10-22, BLC-08b): 본인 문체 — 회원별 글 표본·공개 RSS 글·문체 분석·승인 기록.
-- 승인(approved_at·approval_hash)은 서버 API만 기록하고, 생성 때 지문을 다시 확인한다. 30일 자동 정리(lib/draftRetention.ts).
create table if not exists public.naver_blog_seo_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  blog_id text,
  samples jsonb not null default '[]'::jsonb,
  posts jsonb not null default '[]'::jsonb,
  profile jsonb,
  approved_at timestamptz,
  approval_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists naver_blog_seo_styles_user_created_idx on public.naver_blog_seo_styles (user_id, created_at desc);
alter table public.naver_blog_seo_styles enable row level security;
create policy "seo_styles_select_own" on public.naver_blog_seo_styles for select to authenticated using (auth.uid() = user_id);
create policy "seo_styles_insert_own" on public.naver_blog_seo_styles for insert to authenticated with check (auth.uid() = user_id);
create policy "seo_styles_update_own" on public.naver_blog_seo_styles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "seo_styles_delete_own" on public.naver_blog_seo_styles for delete to authenticated using (auth.uid() = user_id);
