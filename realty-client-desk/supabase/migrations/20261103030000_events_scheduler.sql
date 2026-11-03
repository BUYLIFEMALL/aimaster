-- AI 중개사무소 고객관리 3단계(2026-11-03, v1.04): 일정(임장·계약·중도금·잔금·만기) + 일정 알림 실행 방식(회원 선택: AIMaster 기본 Vercel / 내 cron-job.org)
-- 대상: AIMaster 운영 DB esgxyikcnnvmlhygjkth. 지침: docs/SCHEDULER_POLICY.md · 기준 구현: booking-reminder `booking_member_scheduler`(같은 구조).
-- 알림은 회원 본인 SOLAPI로 회원 본인 핸드폰(profiles.phone)에만 보낸다(고객에게 보내지 않음). 보관 1년(관리자 지정, 정리는 운영 정리 호출).

create table if not exists public.realty_desk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.realty_desk_clients(id) on delete set null,
  listing_id uuid references public.realty_desk_listings(id) on delete set null,
  kind text not null check (kind in ('임장', '계약', '중도금', '잔금', '만기', '기타')),
  title text not null check (char_length(title) between 1 and 60),
  event_at timestamptz not null,
  notify_days smallint not null default 1 check (notify_days between 0 and 90), -- 며칠 전 아침 8시에 알릴지(0 = 당일)
  notified_at timestamptz,
  done boolean not null default false,
  memo text check (memo is null or char_length(memo) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists realty_desk_events_user_idx on public.realty_desk_events (user_id, event_at);
create index if not exists realty_desk_events_due_idx on public.realty_desk_events (event_at) where notified_at is null and done = false;

alter table public.realty_desk_events enable row level security;
drop policy if exists "desk events own" on public.realty_desk_events;
create policy "desk events own" on public.realty_desk_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.realty_desk_member_scheduler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'vercel' check (mode in ('vercel', 'cronjob')),
  token_hash text not null unique,
  cronjob_job_id bigint,
  active boolean not null default false,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.realty_desk_member_scheduler enable row level security;
drop policy if exists realty_desk_member_scheduler_select_own on public.realty_desk_member_scheduler;
create policy realty_desk_member_scheduler_select_own on public.realty_desk_member_scheduler for select to authenticated using (auth.uid() = user_id);
-- 쓰기는 서버(서비스 롤)만: 서버 동작이 로그인·이용 권한을 확인한 뒤 기록한다.
-- 버전(programs.version v1.04)은 배포 뒤 scripts/deploy.mjs --set-version으로 맞춘다.
