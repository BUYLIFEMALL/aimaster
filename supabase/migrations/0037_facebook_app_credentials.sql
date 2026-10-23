-- 2026-10-16 (주인님 승인): insta_auto_poster의 "Facebook 페이지로 연결" 방식은 Facebook(메타) 앱 ID/시크릿,
-- "Instagram 로그인" 방식은 Instagram 앱 ID/시크릿이 필요한데 둘 다 meta_app_id/meta_app_secret 한 칸을 써서
-- 한 번에 한 방식만 가능했다(시험 계정: Facebook 앱 ID가 들어가 Instagram 방식이 "Invalid platform app").
-- Facebook 방식 전용 칸 facebook_app_id/facebook_app_secret을 추가한다. 기존 데이터는 건드리지 않는다
-- (Facebook 방식은 새 칸이 비어 있으면 같은 회원의 meta_app_* 값을 그대로 씀 — 기존 연결 유지).
-- 현재 CHECK 목록(운영 DB 조회 결과)에 두 값만 더한다.

ALTER TABLE public.user_api_keys DROP CONSTRAINT user_api_keys_provider_check;
ALTER TABLE public.user_api_keys ADD CONSTRAINT user_api_keys_provider_check CHECK (provider = ANY (ARRAY[
  'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video', 'google_client_id',
  'google_client_secret', 'replicate', 'serpapi', 'meta_app_id', 'meta_app_secret',
  'threads_app_id', 'threads_app_secret', 'coupang_access_key', 'coupang_secret_key',
  'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id', 'naver_client_id',
  'naver_client_secret', 'ncp_access_key', 'ncp_secret_key', 'kakao_rest_api_key', 'kakao_admin_key',
  'kakao_client_secret', 'naver_ads_api_key', 'naver_ads_secret_key', 'naver_ads_customer_id',
  'domeggook_api_key', 'youtube_api_key', 'elevenst_api_key', 'toss_access_key', 'toss_secret_key',
  'toss_publisher_id', 'seoul_opendata_api_key', 'data_go_kr_service_key', 'vworld_api_key',
  'vworld_domain', 'unsplash', 'pexels', 'pixabay',
  'facebook_app_id', 'facebook_app_secret'
]::text[]));
