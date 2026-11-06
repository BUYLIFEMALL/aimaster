-- RQ-A4 1단계(2026-11-06, 주인님 승인): 한국부동산원 R-ONE 상업용부동산 임대동향 — 상권별 임대료·공실률 분기 캐시.
-- 공공 무료 자료(운영 공용 키 예외 §8). 회원 개인 자료가 아니라 공용 참고값이라 30일 삭제 대상이 아님.
-- 서버(service role)만 읽고 쓴다 — 공개 정책 없음.
create table if not exists public.rone_commercial_rent (
  quarter text not null,                 -- 202603
  area text not null,                    -- 서울>강남>강남대로
  quarter_label text not null,           -- 2026년 3분기
  name text not null,                    -- 강남대로
  depth smallint not null,               -- 1 전국·시도, 2~3 상권(서울 2는 권역)
  leaf boolean not null default false,   -- 맨 끝 상권(좌표 대상)
  rent jsonb not null default '{}',      -- {large, small, set, office} 천원/㎡
  vacancy jsonb not null default '{}',   -- {large, small, set, office} %
  lat double precision,
  lng double precision,
  geocode_tried_at timestamptz,          -- 좌표 찾기를 해 봤는지(못 찾아도 기록)
  updated_at timestamptz not null default now(),
  primary key (quarter, area)
);
alter table public.rone_commercial_rent enable row level security;

update public.programs set version = 'v1.54', updated_at = now() where slug = 'real-estate-sales';
