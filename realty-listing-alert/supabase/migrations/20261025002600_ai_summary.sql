-- realty-listing-alert v1.22: 🤖 AI 시세 요약 켜기·쓸 AI (주인님 승인 2026-10-25 「진행해」 — DB 칸 2개) · 운영 DB esgxyikcnnvmlhygjkth
-- 회원 본인 AI 키(공용 user_api_keys openai·gemini)로 확장이 회원 PC에서 하루 1번 숫자 통계만 보내 요약한다.
alter table public.realty_alert_settings add column if not exists notify_ai_summary boolean not null default false;
alter table public.realty_alert_settings add column if not exists ai_provider text;
alter table public.realty_alert_settings drop constraint if exists realty_alert_settings_ai_provider_check;
alter table public.realty_alert_settings add constraint realty_alert_settings_ai_provider_check check (ai_provider is null or ai_provider in ('gemini', 'openai'));
select column_name, data_type, column_default from information_schema.columns where table_schema = 'public' and table_name = 'realty_alert_settings' and column_name in ('notify_ai_summary', 'ai_provider');
