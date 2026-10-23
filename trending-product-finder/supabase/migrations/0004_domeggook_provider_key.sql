-- 도매매(dome.co.kr) Open API 연동을 위한 provider 추가.
-- 국내 위탁소싱 상품 제안(관세/부가세/해외운송비 불필요) 기능에 사용한다.
-- 개인 ID 로그인만으로 API Key 즉시 무료 발급 가능(승인 절차 없는 Open API 등급).
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
    'domeggook_api_key'
  ])
);
