-- U7 업무 받은편지함 (2026-10-24, 주인님 승인): 다른 AIMaster 프로그램 결과가 회원별로 모이는 공용 표.
-- 플랜: ai-work-workspace/docs/PLAN_20261024_U7_WORK_INBOX.md · 사용 안내: docs/WORK_INBOX.md
-- 회원 본인 줄만 읽기·고치기·지우기(RLS). 넣기(insert)는 각 프로그램 서버가 로그인 회원 확인 뒤 서버 키로만.
-- 30일 자동 삭제: ai-work-workspace 하루 1회 운영 정리 작업(/api/cron/jobs)이 생성 30일 지난 줄을 지운다.
create table if not exists public.work_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_slug text not null check (source_slug ~ '^[a-z0-9-]{2,60}$'),
  kind text not null default 'note' check (kind in ('note','task','meeting','document','table','link')),
  title text not null check (char_length(title) between 1 and 200),
  body_md text not null default '' check (char_length(body_md) <= 200000),
  data jsonb not null default '{}'::jsonb,
  source_url text,
  created_at timestamptz not null default now(),
  imported_at timestamptz,
  imported_ref text
);
create index if not exists work_inbox_user_created on public.work_inbox (user_id, created_at desc);
alter table public.work_inbox enable row level security;
drop policy if exists work_inbox_select_own on public.work_inbox;
create policy work_inbox_select_own on public.work_inbox for select using (auth.uid() = user_id);
drop policy if exists work_inbox_update_own on public.work_inbox;
create policy work_inbox_update_own on public.work_inbox for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists work_inbox_delete_own on public.work_inbox;
create policy work_inbox_delete_own on public.work_inbox for delete using (auth.uid() = user_id);
comment on table public.work_inbox is 'AIMaster 공용 업무 받은편지함 — 다른 프로그램 결과를 회원별로 받아 ai-work-workspace에서 페이지·표 행으로 가져감(30일 자동 삭제)';
