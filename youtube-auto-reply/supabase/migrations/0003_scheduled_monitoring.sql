-- 사용자가 직접 켜고 끌 수 있는 "예약 모니터링" 기능. real_estate_sales의
-- collect_interval_minutes/last_run_at 패턴(단일 Vercel Cron이 5분마다 깨우고, 사용자별로
-- "이번엔 처리할 차례인가"를 판단)을 그대로 재사용한다.
alter table public.ytreply_settings
  add column monitoring_enabled boolean not null default false,
  add column monitoring_interval_minutes int not null default 60
    check (monitoring_interval_minutes in (5, 10, 30, 60, 120, 180, 240, 300, 360, 720, 1440)),
  -- 이 시점 이후에 달린 댓글만 자동 처리 대상으로 삼는다(켤 때 밀린 과거 댓글이 한꺼번에
  -- 몰려서 처리되는 것을 방지). 기본은 "시작" 누른 시각이지만 사용자가 직접 다른 시점을
  -- 고를 수도 있다.
  add column monitoring_started_at timestamptz,
  add column last_run_at timestamptz;
