-- 공용 user_api_keys.provider check 제약에 이 프로젝트가 쓰는 meta_app_id/meta_app_secret을
-- 추가한다(instagram-comment-reply가 이미 추가해뒀다면 이 구문은 그대로 idempotent하게 동작함).
alter table public.user_api_keys drop constraint if exists user_api_keys_provider_check;
alter table public.user_api_keys add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video',
    'google_client_id', 'google_client_secret', 'replicate', 'serpapi',
    'meta_app_id', 'meta_app_secret'
  ]));

create table public.th_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  threads_user_id text not null,
  username text not null,
  access_token text not null,
  token_expires_at timestamptz,
  needs_reconnect boolean not null default false,
  last_checked_at timestamptz,
  reconnect_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.th_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  threads_post_id text not null,
  text text,
  permalink text,
  -- 요청사항: 기본은 계정의 모든 게시물이 모니터링 대상이고, 원치 않는 게시물만 개별로 끌 수 있다.
  is_monitored boolean not null default true,
  is_hidden boolean not null default false,
  custom_link text, -- 비어있으면 th_settings.default_link 사용
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, threads_post_id)
);

create index th_posts_user_id_idx on public.th_posts(user_id);

create table public.th_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  default_link text,
  ai_instructions text,
  tone_preset text,
  reply_model text not null default 'gpt-5.6-luna',
  monitoring_enabled boolean not null default false,
  monitoring_interval_minutes integer not null default 60
    check (monitoring_interval_minutes in (5, 10, 30, 60, 120, 180, 240, 300, 360, 720, 1440)),
  monitoring_started_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.th_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.th_posts(id) on delete cascade,
  threads_reply_id text not null,
  author_username text,
  comment_text text not null,
  status text not null default 'pending_review' check (status in ('pending_review', 'posted', 'skipped', 'failed')),
  generated_reply text,
  posted_reply_id text,
  fetched_at timestamptz not null default now(),
  replied_at timestamptz,
  telegram_chat_id text,
  telegram_message_id bigint,
  unique (user_id, threads_reply_id)
);

create index th_comments_user_id_idx on public.th_comments(user_id);
create index th_comments_post_id_idx on public.th_comments(post_id);
create index th_comments_status_idx on public.th_comments(status);

alter table public.th_accounts enable row level security;
alter table public.th_posts enable row level security;
alter table public.th_settings enable row level security;
alter table public.th_comments enable row level security;

create policy "owner_all_th_accounts" on public.th_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_th_posts" on public.th_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_th_settings" on public.th_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_th_comments" on public.th_comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
