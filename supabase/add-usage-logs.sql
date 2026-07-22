-- =============================================
-- platform-hub: 프로그램별 사용량/크레딧 추적 + 개별 권한 만료일 추가
-- Supabase SQL Editor에서 실행 (기존 schema.sql에 추가하는 패치)
-- =============================================

-- 1. 개별 사용자 프로그램 접근 권한에 만료일 추가 (관리자 지정 접근권한도 기간제 가능하도록)
ALTER TABLE user_program_access
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. 프로그램별 사용량/크레딧 로그
-- AI API는 호출할 때마다 비용이 발생하므로, 구독 여부와 별개로
-- 실제 사용량(횟수/토큰/크레딧)을 기록해 한도 제어와 비용 정산에 활용한다.
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  action text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  credits_used numeric(10,2) NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_program ON usage_logs(user_id, program_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- 본인 사용량만 조회 가능
DROP POLICY IF EXISTS "usage_logs_select_own" ON usage_logs;
CREATE POLICY "usage_logs_select_own" ON usage_logs FOR SELECT USING (auth.uid() = user_id);

-- 기록(insert)은 서비스롤(각 프로그램의 API route)에서만 수행 — 클라이언트 직접 insert 금지
DROP POLICY IF EXISTS "usage_logs_insert_service_role" ON usage_logs;
CREATE POLICY "usage_logs_insert_service_role" ON usage_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

SELECT 'usage_logs table + user_program_access.expires_at added!' AS result;
