-- =============================================
-- FAQ(자주 묻는 질문) 테이블 추가
-- /support/faq 공개 페이지 + /admin/faq 관리 화면에서 사용
-- Supabase SQL Editor에서 실행
-- =============================================

CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '일반',
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS faq_items_updated_at ON faq_items;
CREATE TRIGGER faq_items_updated_at
  BEFORE UPDATE ON faq_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

-- 누구나 활성화된 FAQ만 조회 가능
CREATE POLICY faq_items_select_active ON faq_items
  FOR SELECT USING (is_active = true);

-- 관리자는 전체 조회/작성/수정/삭제 가능
CREATE POLICY admin_all_faq_items ON faq_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
