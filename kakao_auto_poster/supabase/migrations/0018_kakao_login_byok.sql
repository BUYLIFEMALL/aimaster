-- 카카오 로그인("나에게 보내기") OAuth를 앱(운영자) 공용 Kakao 앱에서 회원별 BYOK 방식으로
-- 전환한다. 지금까지는 Vercel 환경변수 KAKAO_REST_API_KEY/KAKAO_CLIENT_SECRET(운영자가 만든
-- 단일 Kakao 앱)로 전 회원이 로그인했는데, 그 앱이 카카오의 "비즈니스 앱 전환" 심사를 받지
-- 않은 동안은 카카오 개발자 콘솔에 테스터로 등록된 계정만 로그인을 완료할 수 있어(Meta 앱
-- Development 모드와 동일한 제약), 운영자 본인 외 다른 회원은 연결할 수 없는 문제가 있었다
-- (threads/threads-affiliate-poster의 meta_app_id/meta_app_secret 전환과 동일한 원인·조치).
--
-- 'kakao_rest_api_key'는 이미 CHECK 제약에 있었지만(supabase/add-ncp-kakao-api-key-providers.sql,
-- NCP/카카오 공용 API 대비로 미리 추가돼있었을 뿐 실제로 쓰는 코드는 없었음) 이번에 처음으로
-- 실사용한다. Client Secret 대응 provider가 없어 'kakao_client_secret'만 신규 추가한다
-- (Client Secret은 카카오 콘솔에서 "활성화"를 켠 경우에만 필요한 선택 항목).
alter table user_api_keys drop constraint if exists user_api_keys_provider_check;
alter table user_api_keys add constraint user_api_keys_provider_check check (
  provider = any (array[
    'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video',
    'google_client_id', 'google_client_secret', 'replicate', 'serpapi',
    'meta_app_id', 'meta_app_secret',
    'coupang_access_key', 'coupang_secret_key',
    'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id',
    'naver_client_id', 'naver_client_secret',
    'ncp_access_key', 'ncp_secret_key',
    'kakao_rest_api_key', 'kakao_admin_key', 'kakao_client_secret',
    'naver_ads_api_key', 'naver_ads_secret_key', 'naver_ads_customer_id',
    'domeggook_api_key', 'youtube_api_key', 'elevenst_api_key',
    'toss_access_key', 'toss_secret_key', 'toss_publisher_id'
  ])
);
