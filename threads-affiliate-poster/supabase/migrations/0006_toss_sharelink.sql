-- Threads 쇼핑제휴 자동화 — 토스쇼핑 쉐어링크(Toss ShareLink) 연동 추가.
-- Access Key/Secret Key(OAuth2 client_credentials)와 publisherId(발급 주체 UUID,
-- 비밀값은 아니지만 aliexpress_tracking_id와 동일하게 본인별 식별자라 같은 방식으로 저장)를
-- 공용 user_api_keys에 provider로 추가. affiliate_products.platform에도 'toss' 추가.
--
-- 토스 쉐어링크 API는 호출 서버의 고정 아웃바운드 IP를 사전 등록해야 해서(회원마다 다른
-- IP가 아니라 우리 플랫폼이 쓰는 고정 IP 1개를 모든 회원이 각자 본인 토스 어드민에
-- 등록), Fixie(usefixie.com)로 고정 IP 프록시를 구축했다 — FIXIE_URL 환경변수, Vercel에
-- 등록 완료(2026-09-04). 이 IP는 운영자 인프라이지 회원별 BYOK 대상이 아니다.

-- user_api_keys는 이 저장소 전체 서브프로젝트가 공유하는 테이블이라, provider check
-- 제약을 다시 걸 때는 이 서브프로젝트 마이그레이션 이력만 보지 말고 반드시 라이브
-- 스키마(pg_get_constraintdef)에서 현재 전체 목록을 먼저 확인해야 한다 — 다른
-- 서브프로젝트(trending-product-finder 등)가 추가해둔 provider가 여기 없으면
-- DROP 후 재생성 시 기존 행이 새 제약을 위반해서 마이그레이션이 실패한다(실제로
-- 2026-09-04에 이 실수로 한 번 실패했었다).
alter table user_api_keys drop constraint user_api_keys_provider_check;

alter table user_api_keys add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video',
    'google_client_id', 'google_client_secret', 'replicate', 'serpapi',
    'meta_app_id', 'meta_app_secret',
    'coupang_access_key', 'coupang_secret_key',
    'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id',
    'naver_client_id', 'naver_client_secret', 'ncp_access_key', 'ncp_secret_key',
    'kakao_rest_api_key', 'kakao_admin_key',
    'naver_ads_api_key', 'naver_ads_secret_key', 'naver_ads_customer_id',
    'domeggook_api_key', 'youtube_api_key', 'elevenst_api_key',
    'toss_access_key', 'toss_secret_key', 'toss_publisher_id'
  ]));

alter table affiliate_products drop constraint affiliate_products_platform_check;
alter table affiliate_products add constraint affiliate_products_platform_check
  check (platform in ('coupang', 'aliexpress', 'naver', 'toss'));
