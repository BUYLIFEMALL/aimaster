-- AI 중개사무소 고객관리 2단계(2026-11-03, v1.03): 내 매물·조건 매칭·매물 안내 문자(광고) 발송 기록·무료 수신거부 링크
-- 대상: AIMaster 운영 DB esgxyikcnnvmlhygjkth. 근거: 정보통신망법 제50조, 시행령 제61조③·별표 6(문자: 시작 「(광고)·전송자 명칭·전화번호 또는 주소」,
-- 끝 「무료 수신거부 방법」), 제62조의2(처리 결과 통지), 제62조의3(2년마다 확인). 보관 1년(관리자 지정, 정리 작업은 3단계).

-- 사무소 정보: 광고 문자 맨 앞에 넣는 전송자 명칭·전화번호(·주소), 선택으로 080 무료 수신거부 번호
create table if not exists public.realty_desk_offices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  office_name text not null check (char_length(office_name) between 1 and 40),
  office_phone text not null check (char_length(office_phone) between 7 and 20),
  office_address text check (office_address is null or char_length(office_address) <= 120),
  reject_080 text check (reject_080 is null or reject_080 ~ '^080-?[0-9]{3,4}-?[0-9]{4}$'),
  updated_at timestamptz not null default now()
);

-- 내 매물(공인중개사법 표시·광고 명시 항목 칸 포함 — 점검은 4단계)
create table if not exists public.realty_desk_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  deal_type text not null check (deal_type in ('매매', '전세', '월세')),
  property_type text not null,
  address text not null check (char_length(address) between 1 and 120), -- 소재지(조건 지역과 맞춰 봄)
  price integer not null check (price >= 0),          -- 만 원(매매가·전세 보증금·월세 보증금)
  monthly integer check (monthly is null or monthly >= 0), -- 월세(만 원)
  area_m2 numeric(8, 2) check (area_m2 is null or area_m2 > 0), -- 전용면적
  floor_info text check (floor_info is null or char_length(floor_info) <= 30),
  rooms smallint, baths smallint,
  direction text check (direction is null or char_length(direction) <= 20),
  move_in text check (move_in is null or char_length(move_in) <= 40),
  parking text check (parking is null or char_length(parking) <= 30),
  approval_date text check (approval_date is null or char_length(approval_date) <= 20),
  mgmt_fee text check (mgmt_fee is null or char_length(mgmt_fee) <= 40),
  memo text check (memo is null or char_length(memo) <= 1000),
  status text not null default '광고 중' check (status in ('광고 중', '계약', '내림')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists realty_desk_listings_user_idx on public.realty_desk_listings (user_id, created_at desc);

-- 매물 안내 발송 기록(먼저 「보내는 중」으로 넣어 자리를 잡은 뒤 보냄 → 겹친 요청으로 두 번 보내지 않음)
create table if not exists public.realty_desk_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.realty_desk_clients(id) on delete set null,
  listing_id uuid references public.realty_desk_listings(id) on delete set null,
  to_phone text not null,
  is_ad boolean not null default true,
  body text not null check (char_length(body) <= 2000),
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists realty_desk_sends_user_idx on public.realty_desk_sends (user_id, created_at desc);
-- 같은 고객에게 같은 매물은 한 번만(다시 보내려면 기록을 지운다)
create unique index if not exists realty_desk_sends_once on public.realty_desk_sends (client_id, listing_id) where client_id is not null and listing_id is not null;

-- 고객별 수신거부 링크 값(수신거부만 할 수 있는 값이라 그대로 저장, 처음 보낼 때 만든다)
alter table public.realty_desk_clients add column if not exists optout_token text unique;

alter table public.realty_desk_offices enable row level security;
alter table public.realty_desk_listings enable row level security;
alter table public.realty_desk_sends enable row level security;

drop policy if exists "desk offices own" on public.realty_desk_offices;
create policy "desk offices own" on public.realty_desk_offices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "desk listings own" on public.realty_desk_listings;
create policy "desk listings own" on public.realty_desk_listings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "desk sends own" on public.realty_desk_sends;
create policy "desk sends own" on public.realty_desk_sends
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- 수신거부 화면(로그인 없음)은 서버가 링크 값을 확인한 뒤 service role로 그 고객 줄의 ad_optout_at만 채운다(공개 정책 없음).
-- 버전(programs.version v1.03)은 배포 뒤 scripts/deploy.mjs --set-version으로 맞춘다.
