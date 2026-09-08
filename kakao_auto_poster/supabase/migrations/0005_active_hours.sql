-- Phase 5(예약 개선): 예약 자동 생성에 "동작 시간대"(종일 / 특정 시간대만) 추가.
-- real_estate_sales의 MonitoringSettings.tsx / trending-product-finder Phase 14·18과
-- 동일한 패턴 — null/null이면 종일(제한 없음), 둘 다 채워지면 그 시간대(KST)에만 예약
-- 자동 생성이 실행된다.
alter table public.kakao_topics
  add column if not exists active_hour_start integer,
  add column if not exists active_hour_end integer;
