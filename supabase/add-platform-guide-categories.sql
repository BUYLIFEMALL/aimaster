-- =============================================
-- API/플랫폼 가이드 카테고리 관리 테이블 추가
-- platform_guides.category는 여전히 자유 텍스트지만, 이 테이블로 카테고리의
-- 존재/이름/노출 순서를 별도로 관리한다(신설/이름수정/순서이동 UI 지원용).
-- 이름을 바꾸면 관리자 API가 platform_guides.category도 함께 일괄 변경한다.
-- Supabase SQL Editor에서 실행
-- =============================================

CREATE TABLE IF NOT EXISTS platform_guide_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS platform_guide_categories_updated_at ON platform_guide_categories;
CREATE TRIGGER platform_guide_categories_updated_at
  BEFORE UPDATE ON platform_guide_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE platform_guide_categories ENABLE ROW LEVEL SECURITY;

-- 카테고리 이름/순서는 민감정보가 아니므로 누구나 조회 가능(공개 /guides 페이지 정렬용)
CREATE POLICY platform_guide_categories_select_all ON platform_guide_categories
  FOR SELECT USING (true);

CREATE POLICY admin_all_platform_guide_categories ON platform_guide_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- 기존에 이미 만들어둔 3개 카테고리를 현재 화면에 보이는 순서 그대로 시드한다.
INSERT INTO platform_guide_categories (name, sort_order)
VALUES ('LLM', 1), ('메신저·알림', 2), ('이커머스', 3)
ON CONFLICT (name) DO NOTHING;
