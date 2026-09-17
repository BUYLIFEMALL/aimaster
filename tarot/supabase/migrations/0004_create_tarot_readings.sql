-- 타로 리딩 이력 테이블 생성
CREATE TABLE IF NOT EXISTS tarot_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spread_type TEXT NOT NULL DEFAULT 'three_cards',
  question TEXT,
  cards JSONB NOT NULL,
  ai_reading TEXT,
  card_images JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE tarot_readings ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 로그인한 본인 데이터만 CRUD 가능
CREATE POLICY "Users can view their own tarot readings"
  ON tarot_readings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tarot readings"
  ON tarot_readings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tarot readings"
  ON tarot_readings FOR DELETE
  USING (auth.uid() = user_id);

-- 인덱스 추가 (user_id 및 created_at)
CREATE INDEX IF NOT EXISTS idx_tarot_readings_user_id ON tarot_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_created_at ON tarot_readings(created_at DESC);
