-- 네이버 검색광고(SearchAd) API 키워드도구(연관키워드조회) 연동을 위한 provider 추가.
-- 카테고리 선택 시 후보 상품군을 자동 추천하는 기능에 사용한다.
-- 개인광고주로 무료 회원가입 가능(사업자등록 불필요).
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
    'naver_ads_api_key', 'naver_ads_secret_key', 'naver_ads_customer_id'
  ])
);
