-- AI 블로그 키워드 자동화 (slug: blog-keyword) — 분석 기록 테이블 (v1.01, 2026-10-14)
-- 공용 Supabase(AIMaster) 한 곳을 쓴다. 회원 본인 기록만 읽고 쓸 수 있다(RLS owner-only).
-- 서버는 service role로 접근하며 모든 쿼리에서 user_id로 직접 거른다. 회원당 최대 100건(즐겨찾기 제외)은 서버가 정리한다.
-- API 키는 공용 user_api_keys의 기존 provider(gemini, naver_client_id, naver_client_secret, naver_ads_*)를 그대로 쓴다 — 제약 변경 없음.

create table if not exists public.blog_keyword_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('autocomplete','related','blogs','competition','recommend','sustainable','news','trend','prompt')),
  keyword text not null default '',
  params jsonb not null default '{}'::jsonb,
  result jsonb not null,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists blog_keyword_reports_user_created_idx
  on public.blog_keyword_reports (user_id, created_at desc);

alter table public.blog_keyword_reports enable row level security;

create policy "blog_keyword_reports_owner_select" on public.blog_keyword_reports
  for select using (auth.uid() = user_id);
create policy "blog_keyword_reports_owner_insert" on public.blog_keyword_reports
  for insert with check (auth.uid() = user_id);
create policy "blog_keyword_reports_owner_update" on public.blog_keyword_reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "blog_keyword_reports_owner_delete" on public.blog_keyword_reports
  for delete using (auth.uid() = user_id);
