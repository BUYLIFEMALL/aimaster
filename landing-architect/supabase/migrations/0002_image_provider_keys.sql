-- 이미지 제공자 키(회원 본인 키) provider 허용값 확장: unsplash / pexels / pixabay (2026-10-13, landing-architect v1.01)
-- 기존 허용값은 그대로 두고 3개만 추가한다(PLATFORM_PATTERNS §14).
ALTER TABLE public.user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_provider_check;
ALTER TABLE public.user_api_keys ADD CONSTRAINT user_api_keys_provider_check CHECK (provider = ANY (ARRAY[
  'openai','anthropic','gemini','perplexity','suno','json2video','google_client_id','google_client_secret','replicate','serpapi',
  'meta_app_id','meta_app_secret','threads_app_id','threads_app_secret','coupang_access_key','coupang_secret_key',
  'aliexpress_app_key','aliexpress_app_secret','aliexpress_tracking_id','naver_client_id','naver_client_secret',
  'ncp_access_key','ncp_secret_key','kakao_rest_api_key','kakao_admin_key','kakao_client_secret',
  'naver_ads_api_key','naver_ads_secret_key','naver_ads_customer_id','domeggook_api_key','youtube_api_key','elevenst_api_key',
  'toss_access_key','toss_secret_key','toss_publisher_id','seoul_opendata_api_key','data_go_kr_service_key','vworld_api_key','vworld_domain',
  'unsplash','pexels','pixabay'
]::text[]));
