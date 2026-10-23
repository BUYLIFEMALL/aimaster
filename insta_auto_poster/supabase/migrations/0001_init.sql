-- 인스타그램 자동 포스팅 관리 웹 - 초기 스키마
-- Supabase SQL Editor 또는 `supabase db push`로 실행하세요.
-- 이 프로젝트는 AIMaster와 같은 Supabase 프로젝트(esgxyikcnnvmlhygjkth)를 공유합니다.

-- 1. updated_at 자동 갱신 트리거 함수
-- threads(0001_init.sql)에서 이미 만들어졌다면 create or replace라 안전하게 재실행됩니다.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. insta_accounts: 사용자별 연결된 인스타그램 비즈니스 계정 정보
create table if not exists public.insta_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ig_user_id text not null,
  ig_username text,
  page_id text not null,
  access_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insta_accounts_user_unique unique (user_id)
);

create trigger insta_accounts_set_updated_at
  before update on public.insta_accounts
  for each row execute function public.set_updated_at();

alter table public.insta_accounts enable row level security;

create policy "insta_accounts_select_own"
  on public.insta_accounts for select
  using (auth.uid() = user_id);

create policy "insta_accounts_insert_own"
  on public.insta_accounts for insert
  with check (auth.uid() = user_id);

create policy "insta_accounts_update_own"
  on public.insta_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "insta_accounts_delete_own"
  on public.insta_accounts for delete
  using (auth.uid() = user_id);

-- 3. insta_posts: 게시글 및 게시 상태 관리
-- 인스타그램 피드 게시물은 이미지가 필수이므로 image_url은 not null이다
-- (threads의 posts.image_url은 선택이지만, 이 프로그램은 다르다).
create table if not exists public.insta_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  caption text not null,
  hashtags text[] not null default '{}',
  image_url text not null,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at timestamptz,
  ig_media_id text,
  ig_permalink text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger insta_posts_set_updated_at
  before update on public.insta_posts
  for each row execute function public.set_updated_at();

-- 예약 게시 실행 배치가 조회할 때 사용하는 인덱스
create index if not exists insta_posts_scheduled_dispatch_idx
  on public.insta_posts (scheduled_at)
  where status = 'scheduled';

create index if not exists insta_posts_user_status_idx
  on public.insta_posts (user_id, status);

alter table public.insta_posts enable row level security;

create policy "insta_posts_select_own"
  on public.insta_posts for select
  using (auth.uid() = user_id);

create policy "insta_posts_insert_own"
  on public.insta_posts for insert
  with check (auth.uid() = user_id);

create policy "insta_posts_update_own"
  on public.insta_posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "insta_posts_delete_own"
  on public.insta_posts for delete
  using (auth.uid() = user_id);

-- 참고: 예약 게시 실행(dispatch-scheduled) API 라우트는 여러 사용자의 예약글을
-- 한 번에 조회해야 하므로 service role 클라이언트(RLS 우회)를 사용합니다.
-- service role key는 서버 환경변수로만 보관하고 클라이언트에 노출하지 않습니다.

-- 참고: newsblur_accounts, user_api_keys 테이블은 threads가 이미 만든 AIMaster
-- 플랫폼 공용 테이블을 그대로 재사용합니다 (threads/supabase/migrations/0001_init.sql,
-- 0003_user_api_keys.sql 참고) — 이 프로젝트에서 다시 만들지 않습니다.
