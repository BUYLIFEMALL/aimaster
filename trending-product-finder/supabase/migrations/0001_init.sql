-- trending-product-finder Phase 1 초기 스키마
-- 1) 공용 user_api_keys.provider check 제약에 네이버 provider 2종 추가
-- 2) programs 카탈로그 등록
-- 3) 이 서브프로젝트 전용 테이블 4종 + RLS owner-only

-- 1) 공용 provider check 확장
alter table user_api_keys drop constraint if exists user_api_keys_provider_check;
alter table user_api_keys add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'anthropic', 'gemini', 'perplexity', 'suno', 'json2video',
    'google_client_id', 'google_client_secret', 'replicate', 'serpapi',
    'meta_app_id', 'meta_app_secret',
    'coupang_access_key', 'coupang_secret_key',
    'aliexpress_app_key', 'aliexpress_app_secret', 'aliexpress_tracking_id',
    'naver_client_id', 'naver_client_secret'
  ]));

-- 2) programs 카탈로그 등록 (이커머스 카테고리, 일반 등급)
insert into programs (name, slug, category_id, short_desc, is_active, required_grade_id, sort_order)
values (
  'AI 소싱 트렌드 발굴',
  'trending-product-finder',
  (select id from categories where slug = 'ecommerce'),
  '네이버 데이터랩·쇼핑검색 데이터로 관심도는 오르는데 경쟁은 적은 소싱 기회를 자동으로 찾아드립니다.',
  true,
  (select id from member_grades where sort_order = 1),
  0
)
on conflict (slug) do nothing;

-- 3) 전용 테이블

create table if not exists trend_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_name text not null,
  naver_category_code text,
  keywords text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trend_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watchlist_id uuid not null references trend_watchlist(id) on delete cascade,
  keyword text,
  trend_index numeric,
  period_start date not null,
  period_end date not null,
  time_unit text not null default 'week',
  source text not null default 'naver_datalab',
  raw jsonb,
  fetched_at timestamptz not null default now()
);

create table if not exists shopping_competition (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watchlist_id uuid references trend_watchlist(id) on delete cascade,
  keyword text not null,
  product_count integer,
  min_price integer,
  max_price integer,
  fetched_at timestamptz not null default now()
);

create table if not exists recommendation_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watchlist_id uuid not null references trend_watchlist(id) on delete cascade,
  generated_at timestamptz not null default now(),
  ai_summary text,
  items jsonb not null default '[]'
);

create index if not exists idx_trend_watchlist_user on trend_watchlist(user_id);
create index if not exists idx_trend_snapshots_watchlist on trend_snapshots(watchlist_id);
create index if not exists idx_shopping_competition_watchlist on shopping_competition(watchlist_id);
create index if not exists idx_recommendation_reports_watchlist on recommendation_reports(watchlist_id);

alter table trend_watchlist enable row level security;
alter table trend_snapshots enable row level security;
alter table shopping_competition enable row level security;
alter table recommendation_reports enable row level security;

create policy "owner_all_trend_watchlist" on trend_watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all_trend_snapshots" on trend_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all_shopping_competition" on shopping_competition
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all_recommendation_reports" on recommendation_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
