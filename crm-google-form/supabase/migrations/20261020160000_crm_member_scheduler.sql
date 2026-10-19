-- 2026-10-20 v1.10 — 접수 후 팔로우업 발송 실행 방식 회원 선택(Vercel / 본인 cron-job.org) (주인님 「2순위도 적용」, Claude Code 윈도우)
-- 지침: docs/SCHEDULER_POLICY.md · 기준 구현: threads `atp_member_scheduler`(같은 구조)
-- cron-job.org 키(provider cronjob_org_api_key)는 공용 user_api_keys 허용 목록에 2026-10-19 이미 추가됨(threads-content-ops v2.07).
create table if not exists public.crm_member_scheduler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'vercel' check (mode in ('vercel', 'cronjob')),
  token_hash text not null unique,
  cronjob_job_id bigint,
  active boolean not null default false,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.crm_member_scheduler enable row level security;
drop policy if exists crm_member_scheduler_select_own on public.crm_member_scheduler;
create policy crm_member_scheduler_select_own on public.crm_member_scheduler for select to authenticated using (auth.uid() = user_id);
-- 쓰기는 서버(서비스 롤)만: 서버 액션이 로그인·이용 권한을 확인한 뒤 기록한다.

update public.programs set version = 'v1.10', updated_at = now() where slug = 'crm-google-form';

select to_regclass('public.crm_member_scheduler') as created_table, (select version from public.programs where slug = 'crm-google-form') as program_version;
