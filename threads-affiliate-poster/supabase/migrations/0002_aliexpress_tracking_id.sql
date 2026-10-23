-- Threads 쇼핑제휴 자동화 — 알리익스프레스 Tracking ID를 사용자별 API 키로 추가
-- 기존엔 registerAliexpressProductAction()에 "threads_affiliate_poster"라는 값이
-- 하드코딩되어 있었다. Tracking ID는 알리익스프레스 포털에서 사용자마다 발급받는
-- 값이라, 공용 user_api_keys 테이블에 provider를 하나 추가해 본인 값만 쓰도록 고친다
-- (이 저장소의 멀티테넌시 원칙 — 관리자 키 폴백 없이 본인 키만 사용).

alter table user_api_keys drop constraint user_api_keys_provider_check;

alter table user_api_keys add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video',
    'google_client_id', 'google_client_secret', 'replicate', 'serpapi',
    'meta_app_id', 'meta_app_secret',
    'coupang_access_key', 'coupang_secret_key',
    'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id'
  ]));
