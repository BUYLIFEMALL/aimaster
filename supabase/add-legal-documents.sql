-- =============================================
-- 이용약관 / 개인정보처리방침 / 환불정책 테이블 추가
-- /terms, /privacy, /refund 공개 페이지 + /admin/legal 관리 화면(한 메뉴, 탭 전환)
-- Supabase SQL Editor에서 실행
-- =============================================

CREATE TABLE IF NOT EXISTS legal_documents (
  slug text PRIMARY KEY CHECK (slug IN ('terms', 'privacy', 'refund')),
  title text NOT NULL,
  content text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS legal_documents_updated_at ON legal_documents;
CREATE TRIGGER legal_documents_updated_at
  BEFORE UPDATE ON legal_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

-- 법적 고지 문서라 비활성화 개념 없이 항상 공개
CREATE POLICY legal_documents_select_all ON legal_documents
  FOR SELECT USING (true);

CREATE POLICY admin_all_legal_documents ON legal_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
