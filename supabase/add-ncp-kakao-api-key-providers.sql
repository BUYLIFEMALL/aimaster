-- =============================================
-- 본인 계정 연동 인프라: NCP·카카오 API 키 provider 추가
-- Supabase SQL Editor에서 실행 (기존 schema.sql에 추가하는 패치)
-- =============================================

-- user_api_keys.provider CHECK 제약에 NCP(Access/Secret Key), 카카오(REST/Admin Key)를 추가한다.
-- naver_client_id / naver_client_secret은 이미 등록되어 있음(이전 세션에서 준비됨).
-- 모두 회원 본인이 자기 계정으로 발급받아 등록하는 키이며(BYOK), AIMaster 공용 키로 폴백하지 않는다.
ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_provider_check;
ALTER TABLE user_api_keys ADD CONSTRAINT user_api_keys_provider_check CHECK (
  provider = ANY (ARRAY[
    'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video',
    'google_client_id', 'google_client_secret', 'replicate', 'serpapi',
    'meta_app_id', 'meta_app_secret',
    'coupang_access_key', 'coupang_secret_key',
    'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id',
    'naver_client_id', 'naver_client_secret',
    'ncp_access_key', 'ncp_secret_key',
    'kakao_rest_api_key', 'kakao_admin_key'
  ])
);

SELECT 'ncp/kakao provider added!' AS result;
