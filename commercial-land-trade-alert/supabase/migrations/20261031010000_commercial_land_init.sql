-- 상가·건물·토지 실거래 알림 (대상 DB: AIMaster 운영 esgxyikcnnvmlhygjkth)
-- 공용 거래 표는 국토부 공개 자료다. 회원 자료는 회원별 RLS로 격리한다.

create table if not exists public.commercial_land_trades (
  id uuid primary key default gen_random_uuid(),
  trade_key text not null unique,
  kind text not null check (kind in ('building', 'land')),
  sgg_cd text not null,
  sgg_nm text not null,
  umd_nm text not null default '',
  jibun text not null default '',
  jibun_masked boolean not null default true,
  deal_date date not null,
  amount_manwon bigint not null,
  category text not null default '',
  building_type text,
  land_use text,
  area_m2 numeric,
  plot_m2 numeric,
  floor text,
  build_year integer,
  is_share boolean not null default false,
  dealing_type text,
  cancelled boolean not null default false,
  cancelled_on text,
  price_per_pyeong numeric,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commercial_land_trades_region_date on public.commercial_land_trades (sgg_cd, deal_date desc);
create index if not exists commercial_land_trades_first_seen on public.commercial_land_trades (first_seen_at desc);
create index if not exists commercial_land_trades_compare on public.commercial_land_trades (sgg_cd, umd_nm, kind, category, deal_date desc);
alter table public.commercial_land_trades enable row level security;
drop policy if exists "commercial_land_trades_read" on public.commercial_land_trades;
create policy "commercial_land_trades_read" on public.commercial_land_trades for select to authenticated using (true);

create table if not exists public.commercial_land_region_state (
  sgg_cd text primary key,
  sgg_nm text not null,
  first_collected_at timestamptz,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  next_due_at timestamptz,
  backfill_months integer not null default 0,
  last_error text
);
alter table public.commercial_land_region_state enable row level security;
drop policy if exists "commercial_land_region_state_read" on public.commercial_land_region_state;
create policy "commercial_land_region_state_read" on public.commercial_land_region_state for select to authenticated using (true);

-- 토지 자료 하루 1,000건 한도를 넘지 않도록 호출 수를 센다. 서버(서비스 키)만 쓴다.
create table if not exists public.commercial_land_api_usage (
  day date not null,
  kind text not null,
  calls integer not null default 0,
  primary key (day, kind)
);
alter table public.commercial_land_api_usage enable row level security;

create table if not exists public.commercial_land_watch (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sgg_cd text not null,
  sgg_nm text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, sgg_cd)
);
alter table public.commercial_land_watch enable row level security;
drop policy if exists "commercial_land_watch_own" on public.commercial_land_watch;
create policy "commercial_land_watch_own" on public.commercial_land_watch for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.commercial_land_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kinds text[] not null default array['building', 'land'],
  excluded_uses text[] not null default array['숙박'],
  excluded_jimoks text[] not null default array['도로', '구거', '하천', '제방', '유지'],
  min_amount bigint,
  max_amount bigint,
  min_area numeric,
  max_area numeric,
  include_share boolean not null default false,
  notify_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.commercial_land_preferences enable row level security;
drop policy if exists "commercial_land_preferences_own" on public.commercial_land_preferences;
create policy "commercial_land_preferences_own" on public.commercial_land_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.commercial_land_user_trades (
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null references public.commercial_land_trades(id) on delete cascade,
  notified_at timestamptz,
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, trade_id)
);
create index if not exists commercial_land_user_trades_trade on public.commercial_land_user_trades (trade_id);
alter table public.commercial_land_user_trades enable row level security;
drop policy if exists "commercial_land_user_trades_own" on public.commercial_land_user_trades;
create policy "commercial_land_user_trades_own" on public.commercial_land_user_trades for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
