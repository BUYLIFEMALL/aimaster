-- Standalone clone of Threads Affiliate Poster — part 3 of 3 (joined into supabase/schema.sql by make-clone.mjs).
-- Run AFTER 00_core_tables.sql and supabase/migrations/0001~0007.
-- 0001 rewrites the provider check with AIMaster's list of the time; replace it with exactly
-- the providers this program saves (see ApiKeyProvider in src/types/database.types.ts).

alter table public.user_api_keys drop constraint if exists user_api_keys_provider_check;
alter table public.user_api_keys add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'gemini', 'anthropic', 'replicate',
    'coupang_access_key', 'coupang_secret_key',
    'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id',
    'toss_access_key', 'toss_secret_key', 'toss_publisher_id',
    'threads_app_id', 'threads_app_secret',
    'naver_client_id', 'naver_client_secret', -- 네이버 트렌드·시장 조사(회원 본인 키, v1.49) — 2026-10-19 키트 점검에서 누락 발견
    'cronjob_org_api_key' -- 예약 발행 「내 cron-job.org」(v1.63, 복제본 기본 방식 — docs/SCHEDULER_POLICY.md)
  ]));
