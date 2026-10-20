-- AI 4컷 만화 자동화 v1.18 (2026-10-20, 주인님 승인 — v1.17 추가개선 제안 ① 진행 지시, Claude Code 윈도우): 인스타 게시 기록 + 예약 게시 + 회원 실행 방식 선택.
-- 기준: ai-webtoon-studio wts_insta_posts·wts_member_scheduler(v1.16)와 같은 구조(원본 카드뉴스 v1.19·v1.24). 지침: 루트 docs/SCHEDULER_POLICY.md
-- 회원별 완전 격리(RLS owner-only: 읽기만), 쓰기·예약 실행은 서버(서비스 키)만. 생성 30일 뒤 자동 삭제는 예약 실행 경로(cleanupOldPosts)가 처리.

create table if not exists public.fcc_insta_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  image_paths text[] not null default '{}',
  page_count int not null default 0,
  caption text not null default '',
  status text not null check (status in ('scheduled', 'publishing', 'published', 'failed', 'canceled')),
  scheduled_at timestamptz,
  published_at timestamptz,
  permalink text,
  ig_username text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fcc_insta_posts_user_created_idx on public.fcc_insta_posts (user_id, created_at desc);
create index if not exists fcc_insta_posts_due_idx on public.fcc_insta_posts (scheduled_at) where status = 'scheduled';
alter table public.fcc_insta_posts enable row level security;
drop policy if exists fcc_insta_posts_select_own on public.fcc_insta_posts;
create policy fcc_insta_posts_select_own on public.fcc_insta_posts for select to authenticated using (auth.uid() = user_id);

create table if not exists public.fcc_member_scheduler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'vercel' check (mode in ('vercel', 'cronjob')),
  token_hash text not null unique,
  cronjob_job_id bigint,
  active boolean not null default false,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fcc_member_scheduler enable row level security;
drop policy if exists fcc_member_scheduler_select_own on public.fcc_member_scheduler;
create policy fcc_member_scheduler_select_own on public.fcc_member_scheduler for select to authenticated using (auth.uid() = user_id);

update public.programs set version = 'v1.18', updated_at = now() where slug = 'four-cut-comics';
