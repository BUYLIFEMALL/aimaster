-- 공용 user_api_keys.provider check 제약에 이 프로젝트가 쓰는 meta_app_id/meta_app_secret을
-- 추가한다(openai/anthropic/gemini 등은 이미 다른 서브프로젝트가 등록해둠).
alter table public.user_api_keys drop constraint if exists user_api_keys_provider_check;
alter table public.user_api_keys add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video',
    'google_client_id', 'google_client_secret', 'replicate', 'serpapi',
    'meta_app_id', 'meta_app_secret'
  ]));

create table public.ig_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  ig_user_id text not null,
  username text not null,
  access_token text not null,
  token_expires_at timestamptz,
  needs_reconnect boolean not null default false,
  last_checked_at timestamptz,
  reconnect_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ig_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ig_media_id text not null,
  caption text,
  permalink text,
  media_type text not null,
  thumbnail_url text,
  -- 요청사항: 기본은 계정의 모든 게시물이 모니터링 대상이고, 원치 않는 게시물만 개별로 끌 수 있다.
  is_monitored boolean not null default true,
  is_hidden boolean not null default false,
  custom_link text, -- 비어있으면 ig_settings.default_link 사용
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, ig_media_id)
);

create index ig_media_user_id_idx on public.ig_media(user_id);

create table public.ig_settings (
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

create table public.ig_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id uuid not null references public.ig_media(id) on delete cascade,
  ig_comment_id text not null,
  author_username text,
  comment_text text not null,
  status text not null default 'pending_review' check (status in ('pending_review', 'posted', 'skipped', 'failed')),
  generated_reply text,
  posted_reply_id text,
  fetched_at timestamptz not null default now(),
  replied_at timestamptz,
  telegram_chat_id text,
  telegram_message_id bigint,
  unique (user_id, ig_comment_id)
);

create index ig_comments_user_id_idx on public.ig_comments(user_id);
create index ig_comments_media_id_idx on public.ig_comments(media_id);
create index ig_comments_status_idx on public.ig_comments(status);

alter table public.ig_accounts enable row level security;
alter table public.ig_media enable row level security;
alter table public.ig_settings enable row level security;
alter table public.ig_comments enable row level security;

create policy "owner_all_ig_accounts" on public.ig_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_ig_media" on public.ig_media
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_ig_settings" on public.ig_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_ig_comments" on public.ig_comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
