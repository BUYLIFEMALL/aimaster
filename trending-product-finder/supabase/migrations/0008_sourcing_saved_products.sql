-- Phase 14 — 관심 상품 찜 + 가격/품절 변화 감지 알림.
-- Phase 18(예약 소싱 알림)이 "키워드로 매번 다시 검색해서 전체 리스트를 보내는" 것과 달리,
-- 이건 "특정 상품 하나를 찜해두고, 그 상품의 가격/품절 상태가 실제로 바뀌었을 때만" 알린다.
-- 플랫폼별 "상품 ID로 단건 조회" API를 새로 붙이지 않고, 저장할 때 쓴 키워드로 재검색해서
-- 그 결과 안에서 같은 product_key를 찾는 방식으로 구현한다(검색 결과에 더 이상 안 보이면
-- 품절/판매중단으로 추정) — 기존 검색 클라이언트를 그대로 재사용하기 위한 설계 선택.
CREATE TABLE IF NOT EXISTS sourcing_saved_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['aliexpress', 'domeggook', 'elevenst'])),
  product_key text NOT NULL,
  title text NOT NULL,
  detail_url text NOT NULL,
  last_price_krw integer,
  last_status text NOT NULL DEFAULT 'in_stock' CHECK (last_status = ANY (ARRAY['in_stock', 'out_of_stock'])),
  last_checked_at timestamptz,
  alert_interval_minutes integer NOT NULL DEFAULT 1440 CHECK (alert_interval_minutes = ANY (ARRAY[60, 180, 360, 720, 1440])),
  alert_channels text[] NOT NULL DEFAULT '{}' CHECK (alert_channels <@ ARRAY['email', 'kakao', 'telegram', 'sms']::text[]),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, product_key)
);

ALTER TABLE sourcing_saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_sourcing_saved_products" ON sourcing_saved_products
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_sourcing_saved_products" ON sourcing_saved_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_sourcing_saved_products" ON sourcing_saved_products
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete_sourcing_saved_products" ON sourcing_saved_products
  FOR DELETE USING (auth.uid() = user_id);
