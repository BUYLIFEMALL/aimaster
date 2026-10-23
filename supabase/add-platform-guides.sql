-- =============================================
-- 플랫폼별 API 생성/연동 가이드 테이블 추가
-- 상단 메뉴 "API생성|플랫폼연동"(/guides) 공개 페이지 + /admin/guides 관리 화면에서 사용
-- 카테고리(LLM/SNS/이커머스 등)로 묶어서 회원들이 플랫폼별 API 키 발급·연동 방법을
-- 따라 할 수 있게 안내하는 매뉴얼 게시판. faq_items와 동일한 설계(category 자유 텍스트,
-- sort_order로 정렬)를 따르되, 내용이 길어질 수 있어 목록+상세페이지 구조(notices와 동일)로 뺀다.
-- Supabase SQL Editor에서 실행
-- =============================================

CREATE TABLE IF NOT EXISTS platform_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '기타',
  title text NOT NULL,
  content text NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS platform_guides_updated_at ON platform_guides;
CREATE TRIGGER platform_guides_updated_at
  BEFORE UPDATE ON platform_guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE platform_guides ENABLE ROW LEVEL SECURITY;

-- 누구나 활성화된 가이드만 조회 가능
CREATE POLICY platform_guides_select_active ON platform_guides
  FOR SELECT USING (is_active = true);

-- 관리자는 전체 조회/작성/수정/삭제 가능
CREATE POLICY admin_all_platform_guides ON platform_guides
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
