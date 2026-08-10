-- 수집 주기 선택지에 5분/10분 추가 (Vercel Pro cron 5분 단위 전환에 맞춤).
alter table real_estate_watch_districts
  drop constraint if exists watch_districts_interval_check;

alter table real_estate_watch_districts
  add constraint watch_districts_interval_check
  check (collect_interval_minutes in (5, 10, 30, 60, 180, 360, 720, 1440));
