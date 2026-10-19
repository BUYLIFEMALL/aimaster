-- 2026-10-19 v2.08 — 예약 발행 실행 방식을 회원이 고른다(주인님 지시): vercel(기본, 사이트 Vercel 예약 호출) | cronjob(본인 cron-job.org 키)
-- 지침: docs/SCHEDULER_POLICY.md. 기존 행은 기본값 vercel이 된다(기존 cron-job.org 작업은 꺼진 상태로 남음 — 회원이 「내 cron-job.org」를 고르면 다시 켜짐).
alter table public.tco_member_scheduler add column if not exists mode text not null default 'vercel';
alter table public.tco_member_scheduler drop constraint if exists tco_member_scheduler_mode_check;
alter table public.tco_member_scheduler add constraint tco_member_scheduler_mode_check check (mode in ('vercel', 'cronjob'));
