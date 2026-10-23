-- 2026-10-20 (주인님 승인): 회원 연동 정보 공용 저장 ⓪단계 — 플랜 docs/PLAN_20261020_MEMBER_INTEGRATIONS.md
-- 한 번 연결한 플랫폼 계정(Threads·Instagram·YouTube·카카오·네이버 로그인 등)을 모든 프로그램이 함께 쓰도록
-- ① 플랫폼 항목 목록(integration_catalog) ② 회원별 연결 계정(member_platform_accounts) 두 표를 새로 만든다.
-- 기존 표(user_api_keys·threads_accounts·insta_accounts 등)는 바꾸거나 지우지 않는다.
-- 토큰은 서버(서비스 키)만 읽는다: 회원(authenticated)에게는 토큰을 뺀 칸만 SELECT 권한을 준다.

-- ① 플랫폼 항목 목록 — 누구나 읽기, 쓰기는 서비스 키만
create table if not exists public.integration_catalog (
  key text primary key,
  kind text not null check (kind in ('oauth_account', 'api_key', 'account_set')),
  label text not null,
  description text,
  key_names text[] not null default '{}',
  scope_sets jsonb not null default '{}'::jsonb,
  guide_id uuid,
  connect_program_url text,
  sort_order int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.integration_catalog enable row level security;
drop policy if exists integration_catalog_read on public.integration_catalog;
create policy integration_catalog_read on public.integration_catalog for select using (true);
revoke all on public.integration_catalog from anon, authenticated;
grant select on public.integration_catalog to anon, authenticated;

-- ② 회원별 연결 계정
create table if not exists public.member_platform_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null references public.integration_catalog (key),
  external_id text not null,
  username text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  refresh_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  auth_method text,
  app_ref text,
  extra jsonb not null default '{}'::jsonb,
  is_default boolean not null default true,
  needs_reconnect boolean not null default false,
  last_checked_at timestamptz,
  connected_via text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_platform_accounts_unique unique (user_id, platform, external_id)
);

create index if not exists member_platform_accounts_user_platform_idx
  on public.member_platform_accounts (user_id, platform);

alter table public.member_platform_accounts enable row level security;
drop policy if exists member_platform_accounts_select_own on public.member_platform_accounts;
create policy member_platform_accounts_select_own on public.member_platform_accounts
  for select using (auth.uid() = user_id);
drop policy if exists member_platform_accounts_delete_own on public.member_platform_accounts;
create policy member_platform_accounts_delete_own on public.member_platform_accounts
  for delete using (auth.uid() = user_id);

-- 회원은 토큰·extra를 뺀 칸만 읽고, 본인 행 삭제(연결 해제)만 할 수 있다. 저장·갱신은 서버(서비스 키)만.
revoke all on public.member_platform_accounts from anon, authenticated;
grant select (id, user_id, platform, external_id, username, token_expires_at, refresh_expires_at,
  granted_scopes, auth_method, is_default, needs_reconnect, last_checked_at, connected_via,
  created_at, updated_at) on public.member_platform_accounts to authenticated;
grant delete on public.member_platform_accounts to authenticated;

-- 카탈로그 첫 항목 (연결형 5개 + 이미 공용인 항목)
insert into public.integration_catalog (key, kind, label, description, key_names, scope_sets, connect_program_url, sort_order) values
  ('threads', 'oauth_account', 'Threads 계정', '본인 Threads 앱으로 연결한 계정. 게시·댓글 프로그램이 함께 씁니다.',
    '{threads_app_id,threads_app_secret}',
    '{"publish":["threads_basic","threads_content_publish"],"replies":["threads_basic","threads_content_publish","threads_read_replies","threads_manage_replies"]}',
    'https://auto-threads-posting.buylife.xyz', 10),
  ('instagram', 'oauth_account', 'Instagram 계정', '본인 Instagram(또는 Facebook) 앱으로 연결한 비즈니스 계정.',
    '{meta_app_id,meta_app_secret,facebook_app_id,facebook_app_secret}',
    '{"publish":["instagram_business_basic","instagram_business_content_publish"],"comments":["instagram_business_basic","instagram_business_manage_comments"],"messages":["instagram_business_basic","instagram_business_manage_messages"]}',
    'https://auto-instagram-posting.buylife.xyz', 20),
  ('youtube', 'oauth_account', 'YouTube 채널', '본인 Google 앱으로 연결한 YouTube 채널.',
    '{google_client_id,google_client_secret}',
    '{"manage":["https://www.googleapis.com/auth/youtube.force-ssl"]}',
    'https://youtube-auto-reply.buylife.xyz', 30),
  ('kakao', 'oauth_account', '카카오 계정', '카카오 로그인으로 연결한 계정(나에게 보내기 등).',
    '{kakao_rest_api_key,kakao_client_secret}', '{}',
    'https://kakao-auto-posting.buylife.xyz', 40),
  ('naver_login', 'oauth_account', '네이버 계정', '네이버 로그인으로 연결한 계정(카페 글쓰기 등).',
    '{naver_client_id,naver_client_secret}', '{}',
    'https://naver-cafe-poster.buylife.xyz', 50),
  ('solapi', 'account_set', '솔라피(문자·알림톡)', '문자·알림톡 발송 계정. 표 user_solapi_accounts.', '{}', '{}', null, 110),
  ('smtp', 'account_set', '메일 발송 계정(SMTP)', '본인 메일 발송 계정. 표 user_smtp_accounts.', '{}', '{}', null, 120),
  ('newsblur', 'account_set', 'NewsBlur', '글감 수집용 뉴스 구독 계정. 표 newsblur_accounts.', '{}', '{}', null, 130),
  ('cronjob_org', 'api_key', 'cron-job.org', '예약 게시·정기 실행용 본인 키.', '{cronjob_org_api_key}', '{}', null, 140)
on conflict (key) do nothing;
