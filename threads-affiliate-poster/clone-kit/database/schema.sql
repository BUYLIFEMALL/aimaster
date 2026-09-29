-- Threads 쇼핑제휴 자동화 — 새 Supabase 프로젝트용 전체 스키마 (make-clone.mjs가 생성)
-- Supabase 대시보드 → SQL Editor → New query에 이 파일 전체를 붙여넣고 Run 한 번이면 된다.
-- 생성 시각: 2026-09-29T09:47:22.804Z

-- ===== clone-kit/database/00_core_tables.sql =====
-- Standalone clone of Threads Affiliate Poster — part 1 of 3 (clone-kit/scripts/make-clone.mjs joins all parts into supabase/schema.sql).
-- Runs before supabase/migrations/0001~0007 in the NEW Supabase project.
--
-- In AIMaster these tables are shared by every program and are created by the root app.
-- A standalone copy has no AIMaster, so this file creates the minimum the program reads:
-- login profile, grade, program row, subscription/grant, API keys, usage log, and the
-- optional detail_pages table (read-only reference from the detail-page program).
-- Payment (Payapp), affiliates, admin screens and catalog tables are intentionally left out.

create extension if not exists pgcrypto;

-- Member grade. The program only reads sort_order.
create table if not exists public.member_grades (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table public.member_grades enable row level security;
create policy grades_select_all on public.member_grades for select using (true);

insert into public.member_grades (name, slug, sort_order)
values ('일반', 'basic', 1)
on conflict (slug) do nothing;

-- One row per signed-up user (filled by the trigger below).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  grade_id uuid references public.member_grades(id),
  is_admin boolean default false,
  is_suspended boolean not null default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, grade_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    (select id from public.member_grades where slug = 'basic')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The program row the access check looks up by slug.
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean default true,
  required_grade_id uuid references public.member_grades(id),
  badges text[] not null default '{}',  -- 'free' = every signed-in member may use it
  version text not null default 'v1.01',
  created_at timestamptz default now()
);
alter table public.programs enable row level security;
create policy programs_select_active on public.programs for select using (is_active = true);

-- required_grade_id = null means every signed-in, non-suspended user may use the program.
-- Set it to a grade id (or use subscriptions / user_program_access) to restrict access.
insert into public.programs (name, slug, required_grade_id)
values ('Threads 쇼핑제휴 자동화', 'threads-affiliate-poster', null)
on conflict (slug) do nothing;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  status text,
  started_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table public.subscriptions enable row level security;
create policy subscriptions_select_own on public.subscriptions for select using (auth.uid() = user_id);

-- Manual grants. Only the owner may read their own rows; writes go through the service role
-- (Supabase dashboard / SQL). Do NOT add a "using (true)" policy here — that lets any user grant themselves access.
create table if not exists public.user_program_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  granted_at timestamptz default now(),
  expires_at timestamptz
);
alter table public.user_program_access enable row level security;
create policy user_program_access_select_own on public.user_program_access for select using (auth.uid() = user_id);

-- Each member's own keys (BYOK). The provider list is finalized in 99_finalize.sql.
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_api_keys_user_provider_unique unique (user_id, provider)
);
alter table public.user_api_keys enable row level security;
create policy user_api_keys_select_own on public.user_api_keys for select using (auth.uid() = user_id);
create policy user_api_keys_insert_own on public.user_api_keys for insert with check (auth.uid() = user_id);
create policy user_api_keys_update_own on public.user_api_keys for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_api_keys_delete_own on public.user_api_keys for delete using (auth.uid() = user_id);

-- Cost-bearing action log (written with the service role only).
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  action text not null,
  quantity integer not null default 1,
  credits_used numeric not null default 0,
  metadata jsonb,
  created_at timestamptz default now()
);
alter table public.usage_logs enable row level security;
create policy usage_logs_select_own on public.usage_logs for select using (auth.uid() = user_id);

-- Optional: in AIMaster the detail-page program writes here and this program only reads it.
-- Kept empty so the "상품정보+상세페이지 직접 입력" screen works without that program.
create table if not exists public.detail_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template text not null default '',
  product_name text not null,
  html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.detail_pages enable row level security;
create policy detail_pages_select_own on public.detail_pages for select using (auth.uid() = user_id);

-- ===== supabase/migrations/0001_threads_affiliate_poster_tables.sql =====
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

-- ===== supabase/migrations/0002_aliexpress_tracking_id.sql =====
-- Threads 쇼핑제휴 자동화 — 알리익스프레스 Tracking ID를 사용자별 API 키로 추가
-- 기존엔 registerAliexpressProductAction()에 "threads_affiliate_poster"라는 값이
-- 하드코딩되어 있었다. Tracking ID는 알리익스프레스 포털에서 사용자마다 발급받는
-- 값이라, 공용 user_api_keys 테이블에 provider를 하나 추가해 본인 값만 쓰도록 고친다
-- (이 저장소의 멀티테넌시 원칙 — 관리자 키 폴백 없이 본인 키만 사용).

alter table user_api_keys drop constraint user_api_keys_provider_check;

alter table user_api_keys add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video',
    'google_client_id', 'google_client_secret', 'replicate', 'serpapi',
    'meta_app_id', 'meta_app_secret',
    'coupang_access_key', 'coupang_secret_key',
    'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id'
  ]));

-- ===== supabase/migrations/0002_tap_trends_bookmarks_personas.sql =====
-- threads-affiliate-poster 트렌드 보관함(tap_saved_posts) 및 사용자 AI 페르소나(tap_personas) 테이블 생성

-- 1. 찜한 트렌드 보관함 (tap_saved_posts)
CREATE TABLE IF NOT EXISTS tap_saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id VARCHAR(100) NOT NULL,
  author_handle VARCHAR(100) NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  likes INT DEFAULT 0,
  replies INT DEFAULT 0,
  reposts INT DEFAULT 0,
  category VARCHAR(50) DEFAULT '일반',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- RLS 설정
ALTER TABLE tap_saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved posts"
  ON tap_saved_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. 나만의 AI 페르소나 (tap_personas)
CREATE TABLE IF NOT EXISTS tap_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  tone_description TEXT NOT NULL,
  sample_writing TEXT,
  emoji_style VARCHAR(50) DEFAULT 'moderate',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE tap_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own personas"
  ON tap_personas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===== supabase/migrations/0003_video_url.sql =====
-- Threads 쇼핑제휴 자동화 — 게시글 영상 첨부 지원
-- 기존 video_filename 컬럼은 파일명만 저장하고 실제로 게시에 쓰이지 않던 미완성
-- 스텁이었다. Threads API가 media_type=VIDEO + video_url(공개 URL)을 요구하므로,
-- 이미지처럼 Supabase Storage(post-images 버킷)에 업로드한 뒤 공개 URL을 저장하는
-- video_url 컬럼으로 교체한다.

alter table tap_posts rename column video_filename to video_url;

-- ===== supabase/migrations/0004_naver_trend_cache.sql =====
-- 네이버 검색어트렌드 공용 캐시.
-- 이 API는 회원 개인 데이터가 아니라 공개 시장 데이터(누가 조회하든 결과 동일)이므로,
-- 회원 각자 네이버 앱을 등록하게 하는 대신 AIMaster(사장님) 계정 하나로 조회하고
-- 그 결과를 여기 캐시해서 전체 회원이 공유한다. TTL은 애플리케이션 코드에서 fetched_at
-- 기준으로 판단한다(예: 24시간). 개인 데이터가 아니므로 user_id 컬럼이 없다.
create table if not exists naver_trend_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  period_months smallint not null,
  time_unit text not null,
  groups jsonb not null, -- 조회에 사용한 keywordGroups 원본(감사/재현용)
  results jsonb not null, -- fetchSearchTrend()의 TrendResultGroup[] 결과
  fetched_at timestamptz not null default now()
);

create index if not exists naver_trend_cache_fetched_at_idx on naver_trend_cache (fetched_at);

alter table naver_trend_cache enable row level security;

-- 개인 데이터가 아니라 회원 전체가 읽는 공용 캐시이므로 로그인한 회원 전체에게 조회를 허용한다.
-- 쓰기는 서버 액션에서 서비스 롤(admin client)로만 수행하므로 별도 insert/update 정책은 만들지 않는다.
drop policy if exists naver_trend_cache_select_authenticated on naver_trend_cache;
create policy naver_trend_cache_select_authenticated
  on naver_trend_cache for select
  to authenticated
  using (true);

-- ===== supabase/migrations/0005_naver_search_cache.sql =====
-- 네이버 검색(뉴스/블로그/카페글) 공용 캐시. naver_trend_cache와 동일한 이유(개인 데이터가
-- 아니라 공개 데이터)로 회원 개인 키 없이 AIMaster 공용 키로 조회하고 캐시를 공유한다.
-- 뉴스는 트렌드보다 갱신이 빠르므로 TTL을 짧게(12시간) 잡는다(애플리케이션 코드에서 판단).
create table if not exists naver_search_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique, -- sha256(search_type + ':' + query)
  search_type text not null,
  query text not null,
  items jsonb not null,
  fetched_at timestamptz not null default now()
);

create index if not exists naver_search_cache_fetched_at_idx on naver_search_cache (fetched_at);

alter table naver_search_cache enable row level security;

drop policy if exists naver_search_cache_select_authenticated on naver_search_cache;
create policy naver_search_cache_select_authenticated
  on naver_search_cache for select
  to authenticated
  using (true);

-- ===== supabase/migrations/0006_toss_sharelink.sql =====
-- Threads 쇼핑제휴 자동화 — 토스쇼핑 쉐어링크(Toss ShareLink) 연동 추가.
-- Access Key/Secret Key(OAuth2 client_credentials)와 publisherId(발급 주체 UUID,
-- 비밀값은 아니지만 aliexpress_tracking_id와 동일하게 본인별 식별자라 같은 방식으로 저장)를
-- 공용 user_api_keys에 provider로 추가. affiliate_products.platform에도 'toss' 추가.
--
-- 토스 쉐어링크 API는 호출 서버의 고정 아웃바운드 IP를 사전 등록해야 해서(회원마다 다른
-- IP가 아니라 우리 플랫폼이 쓰는 고정 IP 1개를 모든 회원이 각자 본인 토스 어드민에
-- 등록), Fixie(usefixie.com)로 고정 IP 프록시를 구축했다 — FIXIE_URL 환경변수, Vercel에
-- 등록 완료(2026-09-04). 이 IP는 운영자 인프라이지 회원별 BYOK 대상이 아니다.

-- user_api_keys는 이 저장소 전체 서브프로젝트가 공유하는 테이블이라, provider check
-- 제약을 다시 걸 때는 이 서브프로젝트 마이그레이션 이력만 보지 말고 반드시 라이브
-- 스키마(pg_get_constraintdef)에서 현재 전체 목록을 먼저 확인해야 한다 — 다른
-- 서브프로젝트(trending-product-finder 등)가 추가해둔 provider가 여기 없으면
-- DROP 후 재생성 시 기존 행이 새 제약을 위반해서 마이그레이션이 실패한다(실제로
-- 2026-09-04에 이 실수로 한 번 실패했었다).
alter table user_api_keys drop constraint user_api_keys_provider_check;

alter table user_api_keys add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video',
    'google_client_id', 'google_client_secret', 'replicate', 'serpapi',
    'meta_app_id', 'meta_app_secret',
    'coupang_access_key', 'coupang_secret_key',
    'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id',
    'naver_client_id', 'naver_client_secret', 'ncp_access_key', 'ncp_secret_key',
    'kakao_rest_api_key', 'kakao_admin_key',
    'naver_ads_api_key', 'naver_ads_secret_key', 'naver_ads_customer_id',
    'domeggook_api_key', 'youtube_api_key', 'elevenst_api_key',
    'toss_access_key', 'toss_secret_key', 'toss_publisher_id'
  ]));

alter table affiliate_products drop constraint affiliate_products_platform_check;
alter table affiliate_products add constraint affiliate_products_platform_check
  check (platform in ('coupang', 'aliexpress', 'naver', 'toss'));

-- ===== supabase/migrations/0007_move_legacy_trend_bookmarks.sql =====
-- Before tap_saved_posts existed in production, bookmarks from /trends were stored as draft
-- tap_posts rows whose content starts with "[TAP_TREND_SAVED]\n{json}". That fallback code was
-- removed; move the remaining rows into tap_saved_posts and delete the draft rows.
-- Example posts ("v-*" ids) take the current example labels instead of the old fabricated authors.

INSERT INTO public.tap_saved_posts (user_id, post_id, author_handle, author_name, content, category)
SELECT t.user_id,
       j->>'postId',
       CASE WHEN j->>'postId' LIKE 'v-%' THEN 'example_' || split_part(j->>'postId', '-', 2) ELSE j->>'authorHandle' END,
       CASE WHEN j->>'postId' LIKE 'v-%' THEN COALESCE(j->>'category', '') || ' 꿀템 예시' ELSE j->>'authorName' END,
       j->>'content',
       COALESCE(j->>'category', '일반')
FROM public.tap_posts t
CROSS JOIN LATERAL (SELECT replace(t.content, E'[TAP_TREND_SAVED]\n', '')::jsonb AS j) parsed
WHERE t.content LIKE '[TAP_TREND_SAVED]%'
ON CONFLICT (user_id, post_id) DO NOTHING;

DELETE FROM public.tap_posts WHERE content LIKE '[TAP_TREND_SAVED]%';

-- ===== clone-kit/database/99_finalize.sql =====
-- Standalone clone of Threads Affiliate Poster — part 3 of 3 (joined into supabase/schema.sql by make-clone.mjs).
-- Run AFTER 00_core_tables.sql and supabase/migrations/0001~0007.
-- 0001 rewrites the provider check with AIMaster's list of the time; replace it with exactly
-- the providers this program saves (see ApiKeyProvider in src/types/database.types.ts).

alter table public.user_api_keys drop constraint if exists user_api_keys_provider_check;
alter table public.user_api_keys add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'gemini', 'anthropic',
    'coupang_access_key', 'coupang_secret_key',
    'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id',
    'toss_access_key', 'toss_secret_key', 'toss_publisher_id',
    'threads_app_id', 'threads_app_secret'
  ]));
