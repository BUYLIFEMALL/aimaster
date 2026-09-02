-- Phase 18 보완 — 예약 소싱 알림도 관심상품(Phase 14)처럼 "변경사항 있을 때만" 받아볼 수
-- 있게 발송 방식을 선택 가능하게 한다("두곳다 변동사항이 있을때만 받아볼수 있도록" 요청,
-- 2026-09-03). 관심상품은 이미 상품 1건을 특정해서 찜하는 구조라 원래부터 변경시에만
-- 알린다(추가 작업 불필요) — 여기서는 키워드 검색 결과 스냅샷을 저장해두고 다음 실행 때
-- 이전 스냅샷과 비교하는 방식으로 구현한다.
ALTER TABLE trend_watchlist
  ADD COLUMN IF NOT EXISTS sourcing_alert_notify_mode text NOT NULL DEFAULT 'always',
  ADD COLUMN IF NOT EXISTS sourcing_alert_last_snapshot jsonb;

ALTER TABLE trend_watchlist DROP CONSTRAINT IF EXISTS trend_watchlist_notify_mode_check;
ALTER TABLE trend_watchlist ADD CONSTRAINT trend_watchlist_notify_mode_check CHECK (
  sourcing_alert_notify_mode = ANY (ARRAY['always', 'changes_only'])
);
