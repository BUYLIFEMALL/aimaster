-- =============================================
-- 공지사항 테이블 추가
-- /support/notice 공개 게시판 + /admin/notices 관리 화면에서 사용
-- Supabase SQL Editor에서 실행
-- =============================================

CREATE TABLE IF NOT EXISTS notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_active boolean DEFAULT true,
  view_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS notices_updated_at ON notices;
CREATE TRIGGER notices_updated_at
  BEFORE UPDATE ON notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- 누구나 활성화된 공지만 조회 가능
CREATE POLICY notices_select_active ON notices
  FOR SELECT USING (is_active = true);

-- 관리자는 전체 조회/작성/수정/삭제 가능
CREATE POLICY admin_all_notices ON notices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
