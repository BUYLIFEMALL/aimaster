-- YouTube Data API v3 연동을 위한 provider 추가.
-- 키워드 관련 영상의 최근 업로드량/조회수를 기회 점수의 세 번째 신호로 쓴다.
-- Google Cloud Console에서 개인 계정으로 무료·즉시 발급 가능한 API Key(OAuth 아님).
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
    'youtube_api_key'
  ])
);
