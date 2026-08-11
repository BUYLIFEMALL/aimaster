-- 토지(대지) 투자분석 확장: 매물이 깔고 앉은 PNU 기준으로 개별공시지가·용도지역/지구를
-- 캐싱하는 테이블. 같은 단지 여러 동/호가 같은 PNU(지번)를 공유하는 경우가 많고,
-- 공시지가는 연 1회만 갱신되므로 real_estate_listings에 컬럼을 추가하는 대신
-- PNU 단위로 전역 공유·캐싱한다 (real_estate_listings와 동일한 접근 패턴).
create table if not exists real_estate_land_info (
  pnu text primary key,
  price_per_m2 bigint,
  price_stdr_year text,
  use_zones text,
  raw_price_data jsonb,
  raw_use_data jsonb,
  fetched_at timestamptz not null default now()
);

alter table real_estate_land_info enable row level security;

create policy "land_info_select_authenticated" on real_estate_land_info
  for select using (auth.uid() is not null);
-- 쓰기는 service role(수집 파이프라인)만 — real_estate_listings와 동일한 패턴
