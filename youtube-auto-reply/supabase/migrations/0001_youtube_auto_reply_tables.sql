-- 유튜브 댓글 자동 답글. 참고할 Make.com 시나리오 없이 신규 기획한 서브프로젝트.
-- 유튜브 OAuth는 shots(유튜브 쇼츠 자동생성)의 패턴을 그대로 따르되, 댓글 답글(comments.insert)에
-- 필요한 youtube.force-ssl 스코프가 shots가 쓰는 upload/readonly와 달라 토큰을 공유하지 않는다
-- (같은 Google Cloud Client ID/Secret은 재사용 가능, user_api_keys의 google_client_id/secret).

create table public.ytreply_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  channel_id text not null,
  channel_title text not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ytreply_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_video_id text not null,
  title text not null,
  thumbnail_url text,
  -- 요청사항: 기본은 채널의 모든 영상이 모니터링 대상이고, 원치 않는 영상만 개별로 끌 수 있다.
  is_monitored boolean not null default true,
  custom_link text, -- 비어있으면 ytreply_settings.default_link 사용
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, youtube_video_id)
);

create index ytreply_videos_user_id_idx on public.ytreply_videos(user_id);

create table public.ytreply_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  default_link text,
  ai_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ytreply_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.ytreply_videos(id) on delete cascade,
  youtube_comment_id text not null,
  author_display_name text,
  comment_text text not null,
  status text not null default 'pending_review' check (status in ('pending_review', 'posted', 'skipped', 'failed')),
  generated_reply text,
  posted_reply_id text,
  fetched_at timestamptz not null default now(),
  replied_at timestamptz,
  unique (user_id, youtube_comment_id)
);

create index ytreply_comments_user_id_idx on public.ytreply_comments(user_id);
create index ytreply_comments_video_id_idx on public.ytreply_comments(video_id);
create index ytreply_comments_status_idx on public.ytreply_comments(status);

alter table public.ytreply_accounts enable row level security;
alter table public.ytreply_videos enable row level security;
alter table public.ytreply_settings enable row level security;
alter table public.ytreply_comments enable row level security;

create policy "owner_all_ytreply_accounts" on public.ytreply_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_ytreply_videos" on public.ytreply_videos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_ytreply_settings" on public.ytreply_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_ytreply_comments" on public.ytreply_comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_api_keys의 provider check 제약에 google_client_id/google_client_secret/openai는
-- 이미 다른 서브프로젝트(shots 등)가 등록해뒀으므로 여기서 추가로 넓힐 제약은 없다.
