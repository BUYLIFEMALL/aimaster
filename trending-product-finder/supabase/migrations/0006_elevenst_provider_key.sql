-- 11번가 Open API(상품검색) 연동을 위한 provider 추가.
-- 셀러 등록 없이 "서비스 등록"(개인 회원가입만으로 가능)만으로 발급되는 일반 Open API 등급.
-- API 키 유효기간 180일 정책이 있으니 회원 안내에 명시할 것.
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
    'kakao_rest_api_key', 'kakao_admin_key',
    'naver_ads_api_key', 'naver_ads_secret_key', 'naver_ads_customer_id',
    'domeggook_api_key',
    'youtube_api_key',
    'elevenst_api_key'
  ])
);
