-- RQ-C 지역 뉴스 레이더(2026-11-09, v1.57, 플랜 docs/PLAN_20261109_RQ_C_NEWS_RADAR.md — 주인님 「추천대로 해」)
-- 관심 지역 뉴스(제목·언론사·날짜·네이버 요약문·원문 링크만, 본문 저장 안 함)와 회원 본인 키 AI 요약. 회원 본인만(RLS).
-- 보관: 뉴스 90일, AI 요약 1년(정리: /api/cron/cleanup-sentiment, profiles.retention_exempt 회원은 제외)

create table if not exists public.real_estate_news_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sgg_cd text not null,
  sgg_nm text not null,
  category text not null check (category in ('개발', '교통', '학교', '규제')),
  title text not null check (char_length(title) <= 300),
  link text not null check (char_length(link) <= 2048),
  link_hash text not null,
  source text,
  snippet text check (snippet is null or char_length(snippet) <= 500),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, link_hash)
);

create index if not exists real_estate_news_items_user_created_idx
  on public.real_estate_news_items (user_id, created_at desc);

alter table public.real_estate_news_items enable row level security;
drop policy if exists "news items select own" on public.real_estate_news_items;
create policy "news items select own" on public.real_estate_news_items
  for select using (auth.uid() = user_id);
drop policy if exists "news items delete own" on public.real_estate_news_items;
create policy "news items delete own" on public.real_estate_news_items
  for delete using (auth.uid() = user_id);
-- 넣기는 서버(예약 작업, 서버 키)만 한다

create table if not exists public.real_estate_news_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  digest_date date not null,
  content text not null check (char_length(content) <= 4000),
  ai_model text,
  created_at timestamptz not null default now(),
  unique (user_id, digest_date)
);

alter table public.real_estate_news_digests enable row level security;
drop policy if exists "news digests select own" on public.real_estate_news_digests;
create policy "news digests select own" on public.real_estate_news_digests
  for select using (auth.uid() = user_id);

alter table public.real_estate_user_preferences
  add column if not exists news_enabled boolean not null default false,
  add column if not exists news_ai_summary boolean not null default false,
  add column if not exists news_sent_on date;

update public.programs set version = 'v1.57', updated_at = now() where slug = 'real-estate-sales';
