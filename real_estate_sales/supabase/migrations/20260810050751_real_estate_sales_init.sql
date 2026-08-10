-- 부동산 실시간 매매정보 (real_estate_sales) 서브프로젝트용 테이블

-- 1. 사용자가 대시보드에서 고른 관심 지역(자치구)
create table if not exists real_estate_watch_districts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sgg_cd text not null,
  sgg_nm text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, sgg_cd)
);

alter table real_estate_watch_districts enable row level security;

create policy "watch_districts_select_own" on real_estate_watch_districts
  for select using (auth.uid() = user_id);
create policy "watch_districts_insert_own" on real_estate_watch_districts
  for insert with check (auth.uid() = user_id);
create policy "watch_districts_update_own" on real_estate_watch_districts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "watch_districts_delete_own" on real_estate_watch_districts
  for delete using (auth.uid() = user_id);

-- 2. 수집된 매물 원본 데이터 (전역 공유, dedup_key로 중복 방지)
create table if not exists real_estate_listings (
  id uuid primary key default gen_random_uuid(),
  dedup_key text not null unique,
  sgg_cd text not null,
  sgg_nm text not null,
  stdg_nm text,
  bldg_nm text,
  dong text,
  ho text,
  floor text,
  contract_date date,
  deal_type text,
  building_area numeric,
  exclusive_area numeric,
  price_amount bigint,
  official_price bigint,
  building_year integer,
  prev_deposit bigint,
  prev_rent bigint,
  pnu text,
  raw_data jsonb,
  collected_at timestamptz not null default now(),
  data_provided_at date
);

create index if not exists idx_real_estate_listings_sgg_cd on real_estate_listings(sgg_cd);
create index if not exists idx_real_estate_listings_collected_at on real_estate_listings(collected_at desc);

alter table real_estate_listings enable row level security;

-- 로그인한 사용자면 누구나 열람 가능 (프로그램 접근권한 확인은 앱 레벨 requireProgramAccess에서)
create policy "listings_select_authenticated" on real_estate_listings
  for select using (auth.uid() is not null);
-- 쓰기는 service role(관리자 클라이언트)만 — 별도 authenticated write 정책 없음

-- 3. 사용자별 "내 피드" (관심 지역에 매칭된 매물)
create table if not exists real_estate_user_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references real_estate_listings(id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'notified', 'analyzed')),
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index if not exists idx_real_estate_user_matches_user_id on real_estate_user_matches(user_id);

alter table real_estate_user_matches enable row level security;

create policy "user_matches_select_own" on real_estate_user_matches
  for select using (auth.uid() = user_id);
create policy "user_matches_update_own" on real_estate_user_matches
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- insert/delete는 service role(수집 파이프라인)에서만

-- 4. 사용자가 요청한 AI 투자 분석 결과
create table if not exists real_estate_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references real_estate_listings(id) on delete cascade,
  model text not null,
  undervaluation_index numeric,
  predicted_growth_pct numeric,
  investment_score numeric,
  rationale text,
  raw_result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_real_estate_analyses_user_listing on real_estate_analyses(user_id, listing_id);

alter table real_estate_analyses enable row level security;

create policy "analyses_select_own" on real_estate_analyses
  for select using (auth.uid() = user_id);
create policy "analyses_insert_own" on real_estate_analyses
  for insert with check (auth.uid() = user_id);

-- 5. 자치구+날짜 단위 시장 분위기 캐시 (Perplexity 중복 호출 방지)
create table if not exists real_estate_district_sentiment (
  id uuid primary key default gen_random_uuid(),
  sgg_nm text not null,
  sentiment_date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (sgg_nm, sentiment_date)
);

alter table real_estate_district_sentiment enable row level security;

create policy "district_sentiment_select_authenticated" on real_estate_district_sentiment
  for select using (auth.uid() is not null);
-- 쓰기는 service role만

-- 6. 텔레그램 연동 (프로그램 공용 — 향후 다른 서브프로젝트도 재사용 가능)
create table if not exists user_telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  chat_id text not null,
  linked_at timestamptz not null default now()
);

alter table user_telegram_links enable row level security;

create policy "telegram_links_select_own" on user_telegram_links
  for select using (auth.uid() = user_id);
create policy "telegram_links_delete_own" on user_telegram_links
  for delete using (auth.uid() = user_id);
-- insert/update(연동 확정)는 웹훅에서 service role로 처리
