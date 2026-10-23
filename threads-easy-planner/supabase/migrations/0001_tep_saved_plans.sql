-- threads-easy-planner 콘텐츠 보관함 (tep_saved_plans) 테이블 생성
-- 멀티테넌시 원칙 준수: user_id + RLS owner-only

CREATE TABLE IF NOT EXISTS tep_saved_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  hook TEXT NOT NULL,
  hook_reason TEXT DEFAULT '',
  hook_variants JSONB DEFAULT '[]'::jsonb,
  body_text TEXT NOT NULL,
  reply_cta TEXT DEFAULT '',
  follow_up_topics JSONB DEFAULT '[]'::jsonb,
  persona_id TEXT,
  persona_name TEXT,
  model_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE tep_saved_plans ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 CRUD 가능 정책
CREATE POLICY "tep_saved_plans_select_own"
  ON tep_saved_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "tep_saved_plans_insert_own"
  ON tep_saved_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tep_saved_plans_update_own"
  ON tep_saved_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tep_saved_plans_delete_own"
  ON tep_saved_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_tep_saved_plans_user_created
  ON tep_saved_plans (user_id, created_at DESC);

-- 30일 보관 정책 자동 삭제 Sweep (크론 또는 함수용 쿼리)
-- DELETE FROM tep_saved_plans WHERE created_at < NOW() - INTERVAL '30 days';

