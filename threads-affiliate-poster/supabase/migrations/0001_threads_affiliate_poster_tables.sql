-- 쓰레드 쇼핑제휴 자동화 - 초기 스키마
-- Supabase SQL Editor 또는 `supabase db push`로 실행하세요.
--
-- 참고: user_api_keys는 AIMaster 전체가 공유하는 테이블이라 여기서는 provider check
-- 제약만 확장한다(실제 적용 전, 현재 라이브 제약에 이미 등록된 provider 전체 목록과
-- 대조해서 빠진 게 없는지 확인할 것 — 아래 목록은 이 세션에서 마지막으로 확인된
-- 시점 기준이라 그 사이 다른 서브프로젝트가 새 provider를 추가했을 수 있다).

alter table public.user_api_keys drop constraint if exists user_api_keys_provider_check;
alter table public.user_api_keys add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video',
    'google_client_id', 'google_client_secret', 'replicate', 'serpapi',
    'meta_app_id', 'meta_app_secret',
    'coupang_access_key', 'coupang_secret_key', 'aliexpress_app_key', 'aliexpress_app_secret'
  ]));

-- updated_at 자동 갱신 트리거 함수 (이미 있으면 그대로 재사용됨)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. tap_accounts: 이 프로그램 전용 Threads 계정 연결 정보
-- (threads/ 프로젝트가 이미 같은 공용 Supabase 프로젝트에 "threads_accounts" 테이블을 쓰고
-- 있어 이름이 겹치므로 "tap_accounts"로 분리한다. 같은 공용 Meta 앱을 재사용하지만, 서로
-- 다른 프로그램이므로 연결 상태는 프로그램마다 독립적으로 관리한다.)
create table public.tap_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  threads_user_id text not null,
  username text,
  access_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tap_accounts_user_unique unique (user_id)
);

create trigger tap_accounts_set_updated_at
  before update on public.tap_accounts
  for each row execute function public.set_updated_at();

alter table public.tap_accounts enable row level security;

create policy "tap_accounts_select_own" on public.tap_accounts for select using (auth.uid() = user_id);
create policy "tap_accounts_insert_own" on public.tap_accounts for insert with check (auth.uid() = user_id);
create policy "tap_accounts_update_own" on public.tap_accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tap_accounts_delete_own" on public.tap_accounts for delete using (auth.uid() = user_id);

-- 2. affiliate_products: 사용자가 등록한 제휴 상품
create table public.affiliate_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('coupang', 'aliexpress', 'naver')),
  product_name text not null,
  product_url text,
  affiliate_url text not null,
  price numeric,
  image_url text,
  -- input_mode: 'url'(간단, 최소 정보) / 'manual'(상품정보 직접 입력, 캡션 품질 향상용)
  input_mode text not null default 'url' check (input_mode in ('url', 'manual')),
  description text,
  key_selling_points text[],
  -- auto-detail-page(상세페이지 자동화)의 detail_pages.id를 느슨하게 참고만 한다.
  -- 서로 다른 서브프로젝트라 FK 제약은 걸지 않는다(애플리케이션 레벨에서만 검증).
  detail_page_id uuid,
  created_at timestamptz not null default now()
);

create index affiliate_products_user_id_idx on public.affiliate_products(user_id);

alter table public.affiliate_products enable row level security;

create policy "affiliate_products_select_own" on public.affiliate_products for select using (auth.uid() = user_id);
create policy "affiliate_products_insert_own" on public.affiliate_products for insert with check (auth.uid() = user_id);
create policy "affiliate_products_update_own" on public.affiliate_products for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "affiliate_products_delete_own" on public.affiliate_products for delete using (auth.uid() = user_id);

-- 3. tap_posts: 게시글 및 게시 상태 관리 (threads/의 posts와 구조가 거의 같지만, 이 프로그램
-- 전용 독립 테이블이며 product_id로 affiliate_products와 연결된다). threads/가 이미
-- "posts"라는 테이블명을 같은 공용 Supabase 프로젝트에서 쓰고 있어 이름이 겹치므로
-- "tap_posts"(threads-affiliate-poster 접두어)로 분리한다.
create table public.tap_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.affiliate_products (id) on delete set null,
  content text not null,
  image_url text,
  video_filename text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at timestamptz,
  threads_post_id text,
  threads_permalink text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tap_posts_set_updated_at
  before update on public.tap_posts
  for each row execute function public.set_updated_at();

create index tap_posts_scheduled_dispatch_idx on public.tap_posts (scheduled_at) where status = 'scheduled';
create index tap_posts_user_status_idx on public.tap_posts (user_id, status);

alter table public.tap_posts enable row level security;

create policy "tap_posts_select_own" on public.tap_posts for select using (auth.uid() = user_id);
create policy "tap_posts_insert_own" on public.tap_posts for insert with check (auth.uid() = user_id);
create policy "tap_posts_update_own" on public.tap_posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tap_posts_delete_own" on public.tap_posts for delete using (auth.uid() = user_id);

-- 4. Storage: threads/ 프로젝트가 이미 만들어둔 공개 버킷 'post-images'를 그대로
-- 재사용한다(경로가 "{auth.uid()}/파일명" 형식으로 사용자별 격리되어 있어 이 프로그램이
-- 새로 업로드해도 안전하다). 버킷/정책이 이미 있으면 아무 것도 하지 않는다.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;
