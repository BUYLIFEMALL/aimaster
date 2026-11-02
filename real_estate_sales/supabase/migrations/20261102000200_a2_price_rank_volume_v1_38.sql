-- A2(v1.38, 2026-11-02 주인님 「진행해」, 플랜 docs/PLAN_20261102_A2_A3.md). 운영 DB esgxyikcnnvmlhygjkth.
-- 1) 새 매매 거래가 같은 단지·비슷한 면적(±3㎡) 보유 거래(12개월, 3건 이상)보다 높으면 high, 낮으면 low. 저장 때 한 번 정한다.
alter table public.real_estate_listings
  add column if not exists price_rank text check (price_rank in ('high', 'low'));

-- 2) 시·군·구 달별 매매 신고 건수(국토부 응답의 전체 건수). 회원 정보가 없는 공공 집계라 서버 키로만 읽고 쓴다(정책 없음 = 일반 키 접근 불가).
create table if not exists public.real_estate_trade_volume (
  sgg_cd text not null,
  ym text not null check (ym ~ '^\d{6}$'),
  property_type text not null,
  count integer not null check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (sgg_cd, ym, property_type)
);
alter table public.real_estate_trade_volume enable row level security;

update public.programs set version = 'v1.38', updated_at = now() where slug = 'real-estate-sales';
