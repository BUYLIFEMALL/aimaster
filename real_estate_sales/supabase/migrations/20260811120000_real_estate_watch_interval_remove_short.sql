-- 실거래가(매매 계약) 데이터는 5분/10분/30분 단위로 갱신될 이유가 없어 예약 조회
-- 주기 선택지에서 제거한다 (기본 조회는 사용자가 직접 누르는 "지금 조회하기"로 대체됨).
-- 기존에 5/10/30분으로 설정해둔 행은 남는 선택지 중 가장 짧은 60분(1시간)으로 올린다.
update real_estate_watch_districts
set collect_interval_minutes = 60
where collect_interval_minutes in (5, 10, 30);

alter table real_estate_watch_districts
  drop constraint if exists watch_districts_interval_check;

alter table real_estate_watch_districts
  add constraint watch_districts_interval_check
  check (collect_interval_minutes in (60, 180, 360, 720, 1440));
