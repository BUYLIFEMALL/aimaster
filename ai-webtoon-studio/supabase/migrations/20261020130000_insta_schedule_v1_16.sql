-- AI 웹툰 자동화 v1.16 (2026-10-20, 주인님 승인 — v1.15 추가개선 제안 ① 진행 지시, Claude Code 윈도우): 인스타 게시 기록 + 예약 게시 + 회원 실행 방식 선택.
-- 기준: ai-influencer-studio `aif_insta_posts`·`aif_member_scheduler`(v1.15)와 같은 구조(원본 카드뉴스 v1.19·v1.24). 지침: 루트 docs/SCHEDULER_POLICY.md
-- 회원별 완전 격리(RLS owner-only: 읽기만), 쓰기·예약 실행은 서버(서비스 키)만. 생성 30일 뒤 자동 삭제는 예약 실행 경로(cleanupOldPosts)가 처리.
-- 인스타 연결값은 이 표에 두지 않는다(공용 insta_accounts 재사용). cron-job.org 키는 공용 user_api_keys(provider cronjob_org_api_key) 재사용.

create table if not exists public.wts_insta_posts (
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
create index if not exists wts_insta_posts_user_created_idx on public.wts_insta_posts (user_id, created_at desc);
create index if not exists wts_insta_posts_due_idx on public.wts_insta_posts (scheduled_at) where status = 'scheduled';
alter table public.wts_insta_posts enable row level security;
drop policy if exists wts_insta_posts_select_own on public.wts_insta_posts;
create policy wts_insta_posts_select_own on public.wts_insta_posts for select to authenticated using (auth.uid() = user_id);

create table if not exists public.wts_member_scheduler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'vercel' check (mode in ('vercel', 'cronjob')),
  token_hash text not null unique,
  cronjob_job_id bigint,
  active boolean not null default false,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wts_member_scheduler enable row level security;
drop policy if exists wts_member_scheduler_select_own on public.wts_member_scheduler;
create policy wts_member_scheduler_select_own on public.wts_member_scheduler for select to authenticated using (auth.uid() = user_id);

update public.programs set version = 'v1.16', updated_at = now() where slug = 'ai-webtoon-studio';

select to_regclass('public.wts_insta_posts') as posts_table, to_regclass('public.wts_member_scheduler') as scheduler_table,
  (select version from public.programs where slug = 'ai-webtoon-studio') as program_version;

-- v1.17 (2026-10-20, 표 변경 없음: 회차 묶음 예약·예약 대기 요약·설정 문구)
update public.programs set version = 'v1.17', updated_at = now() where slug = 'ai-webtoon-studio';
