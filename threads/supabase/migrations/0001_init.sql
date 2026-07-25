-- Threads 자동 포스팅 관리 웹 - 초기 스키마
-- Supabase SQL Editor 또는 `supabase db push`로 실행하세요.

-- 1. updated_at 자동 갱신 트리거 함수
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. threads_accounts: 사용자별 연결된 Threads 계정 정보
create table if not exists public.threads_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  threads_user_id text not null,
  username text,
  access_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint threads_accounts_user_unique unique (user_id)
);

create trigger threads_accounts_set_updated_at
  before update on public.threads_accounts
  for each row execute function public.set_updated_at();

alter table public.threads_accounts enable row level security;

create policy "threads_accounts_select_own"
  on public.threads_accounts for select
  using (auth.uid() = user_id);

create policy "threads_accounts_insert_own"
  on public.threads_accounts for insert
  with check (auth.uid() = user_id);

create policy "threads_accounts_update_own"
  on public.threads_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "threads_accounts_delete_own"
  on public.threads_accounts for delete
  using (auth.uid() = user_id);

-- 3. posts: 게시글 및 게시 상태 관리
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at timestamptz,
  threads_post_id text,
  threads_permalink text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- 예약 게시 실행 배치가 조회할 때 사용하는 인덱스
create index if not exists posts_scheduled_dispatch_idx
  on public.posts (scheduled_at)
  where status = 'scheduled';

create index if not exists posts_user_status_idx
  on public.posts (user_id, status);

alter table public.posts enable row level security;

create policy "posts_select_own"
  on public.posts for select
  using (auth.uid() = user_id);

create policy "posts_insert_own"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "posts_update_own"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "posts_delete_own"
  on public.posts for delete
  using (auth.uid() = user_id);

-- 참고: 예약 게시 실행(dispatch-scheduled) API 라우트는 여러 사용자의 예약글을
-- 한 번에 조회해야 하므로 service role 클라이언트(RLS 우회)를 사용합니다.
-- service role key는 서버 환경변수로만 보관하고 클라이언트에 노출하지 않습니다.
