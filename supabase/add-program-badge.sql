-- =============================================
-- 프로그램 썸네일 추천 뱃지 (관리자 수동 지정) 추가
-- Supabase SQL Editor에서 실행 (기존 schema.sql에 추가하는 패치)
-- =============================================

-- programs.badge: 기존엔 "카테고리 목록 맨 앞 프로그램 = 무조건 BEST" 하드코딩이었으나,
-- 관리자가 프로그램 수정 페이지에서 직접 뱃지를 고르거나(null이면 없앨 수) 있게 변경.
-- Badge 컴포넌트 variant와 동일한 값만 허용, 홈/전체목록/카테고리목록 어디서든 이 값 하나로 통일 노출.
ALTER TABLE programs ADD COLUMN IF NOT EXISTS badge text
  CHECK (badge IS NULL OR badge IN ('new', 'best', 'sale', 'coming', 'free'));
COMMENT ON COLUMN programs.badge IS '관리자가 수동으로 다는 추천 뱃지 (Badge 컴포넌트 variant와 동일한 값). null이면 뱃지 없음.';

SELECT 'programs.badge added!' AS result;
