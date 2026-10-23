-- 2026-10-19 업그레이드: 예약 발행 자동 실행(cron-job.org API 키 저장)을 위해 키 이름 'cronjob_org_api_key'를 허용 목록에 추가합니다.
-- (같은 날 추가) 회원별 예약 실행 연결 표 tco_member_scheduler도 만듭니다.
-- 2026-10-19 이전에 schema.sql로 설치한 경우에만 Supabase → SQL Editor에서 한 번 실행하세요(새로 설치하면 필요 없음). 기존 데이터는 바뀌지 않습니다.
alter table public.user_api_keys drop constraint if exists user_api_keys_provider_check;
alter table public.user_api_keys add constraint user_api_keys_provider_check check (provider = any (array['openai','anthropic','gemini','perplexity','suno','json2video','google_client_id','google_client_secret','replicate','serpapi','meta_app_id','meta_app_secret','threads_app_id','threads_app_secret','coupang_access_key','coupang_secret_key','aliexpress_app_key','aliexpress_app_secret','aliexpress_tracking_id','naver_client_id','naver_client_secret','ncp_access_key','ncp_secret_key','kakao_rest_api_key','kakao_admin_key','kakao_client_secret','naver_ads_api_key','naver_ads_secret_key','naver_ads_customer_id','domeggook_api_key','youtube_api_key','elevenst_api_key','toss_access_key','toss_secret_key','toss_publisher_id','seoul_opendata_api_key','data_go_kr_service_key','vworld_api_key','vworld_domain','unsplash','pexels','pixabay','facebook_app_id','facebook_app_secret','cronjob_org_api_key']::text[]));

-- 예약 발행 실행 연결(2026-10-19): 회원 본인 cron-job.org 작업용 회원 전용 토큰(해시만)·작업 번호·켜짐·일시정지. 지침: AIMaster docs/SCHEDULER_POLICY.md
create table if not exists public.tco_member_scheduler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  cronjob_job_id bigint,
  active boolean not null default false,
  paused boolean not null default false,
  mode text not null default 'cronjob' check (mode in ('vercel', 'cronjob')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- mode: 예약 발행 실행 방식(배포판 기본 cronjob = 회원 본인 cron-job.org, vercel = Vercel 예약 호출 — Pro에서 KIT/enable-vercel-cron 실행 후 선택)
alter table public.tco_member_scheduler add column if not exists mode text not null default 'cronjob';
alter table public.tco_member_scheduler enable row level security;
drop policy if exists tco_member_scheduler_select_own on public.tco_member_scheduler;
create policy tco_member_scheduler_select_own on public.tco_member_scheduler for select to authenticated using (auth.uid() = user_id);
