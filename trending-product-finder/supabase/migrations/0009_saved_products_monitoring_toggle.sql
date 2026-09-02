-- Phase 14 보완 — real_estate_sales의 "모니터링 ON/OFF + 동작 시간대" 예약 설정 UI를
-- 그대로 참고해서, 관심상품도 삭제하지 않고 추적만 켜고 끌 수 있게 하고, 원치 않는
-- 시간대(예: 새벽)에는 재조회/알림이 안 나가게 활성 시간대를 지정할 수 있게 한다.
ALTER TABLE sourcing_saved_products
  ADD COLUMN IF NOT EXISTS alert_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS active_hour_start smallint,
  ADD COLUMN IF NOT EXISTS active_hour_end smallint;

ALTER TABLE sourcing_saved_products DROP CONSTRAINT IF EXISTS sourcing_saved_products_active_hour_start_check;
ALTER TABLE sourcing_saved_products ADD CONSTRAINT sourcing_saved_products_active_hour_start_check CHECK (
  active_hour_start IS NULL OR (active_hour_start >= 0 AND active_hour_start <= 23)
);
ALTER TABLE sourcing_saved_products DROP CONSTRAINT IF EXISTS sourcing_saved_products_active_hour_end_check;
ALTER TABLE sourcing_saved_products ADD CONSTRAINT sourcing_saved_products_active_hour_end_check CHECK (
  active_hour_end IS NULL OR (active_hour_end >= 0 AND active_hour_end <= 23)
);
