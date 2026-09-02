-- Phase 18 보완 — 관심상품(Phase 14)에 추가한 "동작 시간대" 설정을 예약 소싱 알림에도
-- 동일하게 추가한다("소싱쪽처럼 시간대 켜고 끄는 기능 넣어줘" 요청, 2026-09-03).
ALTER TABLE trend_watchlist
  ADD COLUMN IF NOT EXISTS sourcing_alert_active_hour_start smallint,
  ADD COLUMN IF NOT EXISTS sourcing_alert_active_hour_end smallint;

ALTER TABLE trend_watchlist DROP CONSTRAINT IF EXISTS trend_watchlist_alert_active_hour_start_check;
ALTER TABLE trend_watchlist ADD CONSTRAINT trend_watchlist_alert_active_hour_start_check CHECK (
  sourcing_alert_active_hour_start IS NULL OR (sourcing_alert_active_hour_start >= 0 AND sourcing_alert_active_hour_start <= 23)
);
ALTER TABLE trend_watchlist DROP CONSTRAINT IF EXISTS trend_watchlist_alert_active_hour_end_check;
ALTER TABLE trend_watchlist ADD CONSTRAINT trend_watchlist_alert_active_hour_end_check CHECK (
  sourcing_alert_active_hour_end IS NULL OR (sourcing_alert_active_hour_end >= 0 AND sourcing_alert_active_hour_end <= 23)
);
