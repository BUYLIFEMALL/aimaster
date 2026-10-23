-- Phase 2: 카카오 채널(SOLAPI) 발송 여부를 리포트별로 추적한다.
alter table public.kakao_reports
  add column if not exists kakao_sent_at timestamptz,
  add column if not exists kakao_send_error text;

-- 참고: 카카오 채널 발송 자체는 trending-product-finder/crm-google-form이 만든 공용
-- user_solapi_accounts 테이블(api_key/api_secret/sender_phone/kakao_pf_id/rcs_brand_id)을
-- 그대로 재사용한다 — 이 프로젝트에서 새로 만들지 않는다.
