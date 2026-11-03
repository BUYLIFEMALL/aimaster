-- AI 중개사무소 고객관리 1단계(2026-11-03, v1.01, 플랜 docs/PLAN_20261103_CLIENT_DESK.md · 동의 문구 docs/CONSENT_DRAFT_20261103.md)
-- 대상: AIMaster 운영 DB esgxyikcnnvmlhygjkth. 고객 명부는 회원(중개사무소)별 격리, 보관 1년(관리자 지정 2026-11-01, 정리 작업은 3단계에서).

-- 고객 접수 링크: 회원이 만들고, 고객은 로그인 없이 링크로 조건·동의를 남긴다. 링크 값은 해시만 저장.
create table if not exists public.realty_desk_intake_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  office_name text not null check (char_length(office_name) between 1 and 60),
  office_phone text check (office_phone is null or char_length(office_phone) <= 30),
  token_hash text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists realty_desk_intake_links_user_idx on public.realty_desk_intake_links (user_id);

-- 관심고객: 동의 기록(수집 동의 필수, 광고 수신 동의 선택) 포함
create table if not exists public.realty_desk_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  phone text not null check (phone ~ '^01[016789]-?[0-9]{3,4}-?[0-9]{4}$'),
  deal_type text not null check (deal_type in ('매매', '전세', '월세')),
  regions text check (regions is null or char_length(regions) <= 200),
  property_types text[] not null default '{}',
  budget_min integer check (budget_min is null or budget_min >= 0), -- 만 원
  budget_max integer check (budget_max is null or budget_max >= 0), -- 만 원(월세면 보증금)
  monthly_max integer check (monthly_max is null or monthly_max >= 0), -- 월세 상한(만 원)
  area_min numeric(7, 2),
  move_in text check (move_in is null or char_length(move_in) <= 40),
  memo text check (memo is null or char_length(memo) <= 1000),
  source text not null check (source in ('intake', 'manual', 'excel')),
  intake_link_id uuid references public.realty_desk_intake_links(id) on delete set null,
  consent_at timestamptz not null,                 -- 개인정보 수집·이용 동의(필수)
  consent_method text not null check (consent_method in ('링크', '전화', '방문', '문자', '서면')),
  consent_version text not null,
  ad_consent_at timestamptz,                       -- 매물 안내(광고) 수신 동의(선택)
  ad_optout_at timestamptz,                        -- 수신거부
  status text not null default '상담 중' check (status in ('상담 중', '보류', '계약', '종료')),
  last_contact_at timestamptz not null default now(), -- 보관 1년 기준
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists realty_desk_clients_user_idx on public.realty_desk_clients (user_id, created_at desc);

alter table public.realty_desk_intake_links enable row level security;
alter table public.realty_desk_clients enable row level security;

drop policy if exists "desk links own" on public.realty_desk_intake_links;
create policy "desk links own" on public.realty_desk_intake_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "desk clients own" on public.realty_desk_clients;
create policy "desk clients own" on public.realty_desk_clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- 고객 접수 화면(로그인 없음)의 저장은 서버가 링크 해시를 확인한 뒤 service role로 그 회원 줄로만 넣는다(공개 정책 없음).
