-- 네이버 매물 감시와 받는 곳 3종 (2026-10-31, v1.02). 대상: 운영 DB esgxyikcnnvmlhygjkth.
-- 매물 내용은 서버에 저장하지 않는다. 감시 대상의 네이버 화면 주소·조건과 예약 설정, 숫자 상태만 저장한다.
create table if not exists public.commercial_land_listing_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  url text not null,
  kinds text not null,
  trade_types text[] not null default array['A1', 'B2'],
  price_min bigint,
  price_max bigint,
  area_min numeric,
  area_max numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);
alter table public.commercial_land_listing_targets enable row level security;
drop policy if exists "commercial_land_listing_targets_own" on public.commercial_land_listing_targets;
create policy "commercial_land_listing_targets_own" on public.commercial_land_listing_targets for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.commercial_land_preferences
  add column if not exists notify_telegram boolean not null default true,
  add column if not exists notify_email boolean not null default false,
  add column if not exists email_to text,
  add column if not exists notify_kakao boolean not null default false,
  add column if not exists schedule_enabled boolean not null default false,
  add column if not exists interval_minutes integer not null default 360,
  add column if not exists active_hour_start integer,
  add column if not exists active_hour_end integer,
  add column if not exists listing_notify_new boolean not null default true,
  add column if not exists listing_notify_drop boolean not null default true,
  add column if not exists listing_notify_rise boolean not null default false,
  add column if not exists listing_notify_gone boolean not null default false,
  add column if not exists ext_version text,
  add column if not exists ext_last_run_at timestamptz,
  add column if not exists ext_last_result text,
  add column if not exists ext_last_count integer,
  add column if not exists ext_last_error text;
