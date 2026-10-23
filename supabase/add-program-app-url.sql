-- =============================================
-- platform-hub: 프로그램별 실제 배포 앱 URL 추가
-- Supabase SQL Editor에서 실행 (기존 schema.sql에 추가하는 패치)
-- =============================================

-- programs.app_url: platform-hub 프로그램(threads 등)처럼 실제 AI 웹앱이
-- 별도로 배포되어 있는 경우, 대시보드에서 "실행하기" 버튼이 이동할 주소.
-- null이면 기존처럼 /programs/{slug} 판매 상세페이지만 사용하는 일반 프로그램.
ALTER TABLE programs ADD COLUMN IF NOT EXISTS app_url text;
COMMENT ON COLUMN programs.app_url IS 'platform-hub: 실제 배포된 AI 웹앱 URL (없으면 일반 판매용 프로그램)';

SELECT 'programs.app_url added!' AS result;
