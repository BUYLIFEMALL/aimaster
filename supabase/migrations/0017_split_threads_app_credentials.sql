-- Threads programs (threads, threads-comment-reply, threads-affiliate-poster) and Instagram
-- programs (insta_auto_poster, instagram-comment-reply, instagram-dm-reply, shots) all stored their
-- member Meta app credentials in the same meta_app_id/meta_app_secret rows, but Meta issues
-- different IDs for Instagram and Threads, so saving one overwrote the other (OAuth error 4476002).
-- Threads programs now use threads_app_id/threads_app_secret; Instagram programs keep meta_app_*.

ALTER TABLE public.user_api_keys DROP CONSTRAINT user_api_keys_provider_check;
ALTER TABLE public.user_api_keys ADD CONSTRAINT user_api_keys_provider_check CHECK (provider = ANY (ARRAY[
  'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video', 'google_client_id',
  'google_client_secret', 'replicate', 'serpapi', 'meta_app_id', 'meta_app_secret',
  'threads_app_id', 'threads_app_secret', 'coupang_access_key', 'coupang_secret_key',
  'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id', 'naver_client_id',
  'naver_client_secret', 'ncp_access_key', 'ncp_secret_key', 'kakao_rest_api_key', 'kakao_admin_key',
  'kakao_client_secret', 'naver_ads_api_key', 'naver_ads_secret_key', 'naver_ads_customer_id',
  'domeggook_api_key', 'youtube_api_key', 'elevenst_api_key', 'toss_access_key', 'toss_secret_key',
  'toss_publisher_id'
]::text[]));

-- Seed the new rows from the shared ones for members who have connected Threads in any program,
-- so current connections keep working. Members whose shared value was an Instagram ID must
-- re-enter the Threads app ID in the Threads programs' settings.
INSERT INTO public.user_api_keys (user_id, provider, api_key)
SELECT k.user_id,
       CASE k.provider WHEN 'meta_app_id' THEN 'threads_app_id' ELSE 'threads_app_secret' END,
       k.api_key
FROM public.user_api_keys k
WHERE k.provider IN ('meta_app_id', 'meta_app_secret')
  AND (
    EXISTS (SELECT 1 FROM public.tap_accounts a WHERE a.user_id = k.user_id)
    OR EXISTS (SELECT 1 FROM public.threads_accounts a WHERE a.user_id = k.user_id)
    OR EXISTS (SELECT 1 FROM public.th_accounts a WHERE a.user_id = k.user_id)
  )
ON CONFLICT (user_id, provider) DO NOTHING;
