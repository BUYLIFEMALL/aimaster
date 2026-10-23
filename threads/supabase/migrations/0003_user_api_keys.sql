-- Threads 자동 포스팅 관리 웹 - 사용자별 AI API 키 저장
-- 사용자가 가입 후 본인정보(설정)에서 GPT(openai)/Claude(anthropic)/Gemini(gemini)/
-- Perplexity(perplexity) API 키를 등록해서 사용할 수 있도록 함.
-- Supabase 대시보드 SQL Editor 또는 `supabase db push`로 실행하세요.

create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'gemini', 'perplexity')),
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_api_keys_user_provider_unique unique (user_id, provider)
);

create trigger user_api_keys_set_updated_at
  before update on public.user_api_keys
  for each row execute function public.set_updated_at();

alter table public.user_api_keys enable row level security;

create policy "user_api_keys_select_own"
  on public.user_api_keys for select
  using (auth.uid() = user_id);

create policy "user_api_keys_insert_own"
  on public.user_api_keys for insert
  with check (auth.uid() = user_id);

create policy "user_api_keys_update_own"
  on public.user_api_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_api_keys_delete_own"
  on public.user_api_keys for delete
  using (auth.uid() = user_id);
