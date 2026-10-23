-- 공용 user_api_keys.provider check 제약에는 meta_app_id/meta_app_secret/openai/anthropic/gemini가
-- 이미 등록되어 있다(instagram-comment-reply 등 다른 서브프로젝트가 추가함). 이 프로젝트는 새
-- provider가 필요 없으므로 이 제약은 건드리지 않는다.

create table public.dm_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  instagram_user_id text not null,
  username text not null,
  access_token text not null,
  token_expires_at timestamptz,
  needs_reconnect boolean not null default false,
  last_checked_at timestamptz,
  reconnect_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dm_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  default_link text,
  ai_instructions text,
  tone_preset text,
  reply_model text not null default 'gpt-5.6-luna',
  disclosure_message text,
  auto_approve boolean not null default false,
  -- 계정 연결과 별개로, 실제 응답을 시작할지는 사용자가 명시적으로 켜야 한다(안전장치).
  bot_enabled boolean not null default false,
  bot_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ig_scoped_id text not null, -- 상대방의 IGSID(대화별 scoped id)
  customer_username text,
  last_inbound_at timestamptz,
  disclosure_sent_at timestamptz, -- 이 대화에 "자동 응답 고지" 메시지를 보낸 시각(최초 1회만)
  created_at timestamptz not null default now(),
  unique (user_id, ig_scoped_id)
);

create index dm_conversations_user_id_idx on public.dm_conversations(user_id);

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  ig_message_id text not null,
  direction text not null check (direction in ('in', 'out')),
  message_text text not null,
  generated_reply text,
  status text not null default 'pending_review' check (status in ('pending_review', 'posted', 'skipped', 'failed')),
  posted_message_id text,
  telegram_chat_id text,
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  replied_at timestamptz,
  unique (user_id, ig_message_id)
);

create index dm_messages_user_id_idx on public.dm_messages(user_id);
create index dm_messages_conversation_id_idx on public.dm_messages(conversation_id);
create index dm_messages_status_idx on public.dm_messages(status);

alter table public.dm_accounts enable row level security;
alter table public.dm_settings enable row level security;
alter table public.dm_conversations enable row level security;
alter table public.dm_messages enable row level security;

create policy "owner_all_dm_accounts" on public.dm_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_dm_settings" on public.dm_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_dm_conversations" on public.dm_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_dm_messages" on public.dm_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
