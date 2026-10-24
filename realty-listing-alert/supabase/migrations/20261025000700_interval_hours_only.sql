-- AI 부동산 매물 알림 — 예약 간격 1~24시간만 (2026-10-25 주인님 지시: 「예약간격 단위를 1시간 단위부터 선택할 수 있도록」)
-- 대상: ① AIMaster 운영 DB (ref esgxyikcnnvmlhygjkth). 실행: 주인님(크롬 SQL 편집기 Run). 다시 실행해도 안전.
-- 혹시 1시간 미만 값이 있으면 1시간으로 올린 뒤 규칙을 바꾼다(2026-10-25 확인 시 해당 줄 0개).
update public.realty_alert_settings set interval_minutes = 60, updated_at = now() where interval_minutes < 60;
alter table public.realty_alert_settings drop constraint if exists realty_alert_settings_interval_minutes_check;
alter table public.realty_alert_settings add constraint realty_alert_settings_interval_minutes_check
  check (interval_minutes % 60 = 0 and interval_minutes between 60 and 1440);
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.realty_alert_settings'::regclass and conname like '%interval%';
