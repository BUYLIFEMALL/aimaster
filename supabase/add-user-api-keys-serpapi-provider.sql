-- =============================================
-- user_api_keys.provider 허용 목록에 'serpapi' 추가
-- Supabase SQL Editor에서 실행 (기존 schema.sql에 추가하는 패치)
-- =============================================

-- competitor-analysis 서브프로젝트가 SerpApi 키를 등록하려다가
-- "violates check constraint user_api_keys_provider_check" 에러를 만난 것을 계기로 추가.
-- 공용 user_api_keys 테이블에 새 provider를 쓰는 서브프로젝트를 만들 때는 반드시
-- 이 체크 제약도 함께 넓혀야 한다(2026-08-13 auto-detail-page의 'replicate' 추가 때와 동일 패턴).
ALTER TABLE user_api_keys DROP CONSTRAINT user_api_keys_provider_check;
ALTER TABLE user_api_keys ADD CONSTRAINT user_api_keys_provider_check
  CHECK (provider = ANY (ARRAY['openai'::text, 'anthropic'::text, 'gemini'::text, 'perplexity'::text, 'suno'::text, 'json2video'::text, 'google_client_id'::text, 'google_client_secret'::text, 'replicate'::text, 'serpapi'::text]));

SELECT 'user_api_keys.provider_check now allows serpapi!' AS result;
