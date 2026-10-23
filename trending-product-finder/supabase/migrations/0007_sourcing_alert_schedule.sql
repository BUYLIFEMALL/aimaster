-- Phase 12 — 관심 키워드별 "예약 소싱 알림": 사용자가 정한 주기마다 실제 소싱 후보
-- 상품 리스트를 검색해 등록해둔 채널(이메일/카카오톡/텔레그램/문자)로 발송한다.
-- real_estate_sales의 예약 조회(collect_interval_minutes/last_run_at) 패턴을 재사용.
-- 기본값은 전부 꺼짐(opt-in) — 기존 회원 누구에게도 영향 없음.
ALTER TABLE trend_watchlist
  ADD COLUMN IF NOT EXISTS sourcing_alert_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sourcing_alert_interval_minutes integer,
  ADD COLUMN IF NOT EXISTS sourcing_alert_channels text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sourcing_alert_last_run_at timestamptz;

ALTER TABLE trend_watchlist DROP CONSTRAINT IF EXISTS trend_watchlist_sourcing_alert_interval_check;
ALTER TABLE trend_watchlist ADD CONSTRAINT trend_watchlist_sourcing_alert_interval_check CHECK (
  sourcing_alert_interval_minutes IS NULL
  OR sourcing_alert_interval_minutes = ANY (ARRAY[60, 180, 360, 720, 1440])
);

ALTER TABLE trend_watchlist DROP CONSTRAINT IF EXISTS trend_watchlist_sourcing_alert_channels_check;
ALTER TABLE trend_watchlist ADD CONSTRAINT trend_watchlist_sourcing_alert_channels_check CHECK (
  sourcing_alert_channels <@ ARRAY['email', 'kakao', 'telegram', 'sms']::text[]
);
