-- 2026-11-10 U11 자동화 — 회원 정시 실행(본인 cron-job.org) 연결 정보 ([역할: workspace] Claude Code 윈도우)
-- 플랜: ai-work-workspace/docs/PLAN_20261110_U11_AUTOMATION.md (주인님 결정 1번: 회원 cron-job.org만, 운영자 cron은 운영 정리만)
-- 지침: docs/SCHEDULER_POLICY.md · 같은 구조: booking_member_scheduler (공용 기준 코드 member-scheduler가 읽는 열)
-- cron-job.org 키(provider cronjob_org_api_key)는 공용 user_api_keys 허용 목록에 2026-10-19 이미 추가됨.
-- 대상 DB: AIMaster 운영(ref esgxyikcnnvmlhygjkth), public 스키마. 추가만 하는 SQL(기존 표·데이터 변경 없음).
create table if not exists public.aww_member_scheduler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'cronjob' check (mode in ('vercel', 'cronjob')),
  token_hash text not null unique,
  cronjob_job_id bigint,
  active boolean not null default false,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.aww_member_scheduler enable row level security;
drop policy if exists aww_member_scheduler_select_own on public.aww_member_scheduler;
create policy aww_member_scheduler_select_own on public.aww_member_scheduler for select to authenticated using (auth.uid() = user_id);
-- 쓰기는 서버(서비스 롤)만: 서버가 로그인·이용 권한을 확인한 뒤 기록한다.

select to_regclass('public.aww_member_scheduler') as created_table;
