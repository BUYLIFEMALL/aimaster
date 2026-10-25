-- realty-listing-alert: 🤖 AI 시세 요약에 Claude 추가(주인님 2026-10-25 「openai / Gemini / claude 3가지」) · 운영 DB esgxyikcnnvmlhygjkth
-- 회원 키는 공용 user_api_keys provider 'anthropic'(다른 AIMaster 프로그램과 같은 이름)
alter table public.realty_alert_settings drop constraint if exists realty_alert_settings_ai_provider_check;
alter table public.realty_alert_settings add constraint realty_alert_settings_ai_provider_check check (ai_provider is null or ai_provider in ('gemini', 'openai', 'claude'));
-- AI별로 고른 모델(설정 화면) — { openai: 'gpt-4o-mini', claude: '…', gemini: '…' } · 없으면 가성비 기본값
alter table public.realty_alert_settings add column if not exists ai_models jsonb not null default '{}'::jsonb;
select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'realty_alert_settings_ai_provider_check';
