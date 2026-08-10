-- 관심 지역별 "실시간 모니터링" 설정: On/Off, 수집 주기, 특정 시간대에만 동작.
-- 켜져 있고(monitoring_enabled) 주기가 지났고(last_run_at 기준) 활성 시간대 안일 때만
-- dispatch 라우트가 그 지역-사용자 조합을 처리한다 (AI 분석/텔레그램 비용 절감 목적).

alter table real_estate_watch_districts
  add column if not exists monitoring_enabled boolean not null default false,
  add column if not exists collect_interval_minutes integer not null default 1440,
  add column if not exists active_hour_start smallint,
  add column if not exists active_hour_end smallint,
  add column if not exists last_run_at timestamptz;

alter table real_estate_watch_districts
  add constraint watch_districts_interval_check
  check (collect_interval_minutes in (30, 60, 180, 360, 720, 1440));

alter table real_estate_watch_districts
  add constraint watch_districts_hour_check
  check (
    (active_hour_start is null and active_hour_end is null)
    or (
      active_hour_start is not null and active_hour_end is not null
      and active_hour_start between 0 and 23
      and active_hour_end between 0 and 23
    )
  );
