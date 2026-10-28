-- AI 쿠팡 운영 자동화 — 회원 기본값·짧은 이미지 주소·등록 기록(C1-5·C1-11·C1-13)
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 적용은 주인님 승인 뒤 크롬 SQL 편집기에서
-- (순서: 20261028_coupang_ops_v1_01.sql → 20261028_coupang_wing_keys_c1_2.sql → 이 파일).
-- 회원 데이터는 본인 행만(RLS), 등록 기록·이미지 주소는 30일 뒤 정리(최상위 규칙 — 생성 데이터 30일).

-- 1) 배송·반품 기본값(회원 1행, jsonb — 정리 규칙은 src/lib/coupang/defaults.ts normalizeDefaults)
create table if not exists public.coupang_ops_defaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.coupang_ops_defaults enable row level security;
drop policy if exists "coupang_ops_defaults_owner" on public.coupang_ops_defaults;
create policy "coupang_ops_defaults_owner" on public.coupang_ops_defaults
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) 짧은 이미지 주소 — 쿠팡 vendorPath는 200자 이하라 비공개 저장소 서명 주소 대신 /i/<id>를 준다.
--    서버(서비스 키)만 읽고 쓴다(회원 정책 없음). 만료 뒤에는 주소가 열리지 않는다.
create table if not exists public.coupang_ops_image_links (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  path text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists coupang_ops_image_links_user on public.coupang_ops_image_links (user_id, created_at desc);
alter table public.coupang_ops_image_links enable row level security;

-- 3) 등록 기록(보낸 본문 요약·쿠팡 응답·상품번호·승인 상태)
create table if not exists public.coupang_ops_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid,
  product_name text not null default '',
  category_code bigint,
  requested boolean not null default false,
  status text not null default 'sending' check (status in ('sending', 'saved', 'requested', 'approved', 'rejected', 'failed', 'unknown')),
  seller_product_id bigint,
  item_count int not null default 0,
  message text,
  response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists coupang_ops_jobs_user on public.coupang_ops_jobs (user_id, created_at desc);
create index if not exists coupang_ops_jobs_product on public.coupang_ops_jobs (user_id, product_id, created_at desc);
alter table public.coupang_ops_jobs enable row level security;
drop policy if exists "coupang_ops_jobs_owner_read" on public.coupang_ops_jobs;
create policy "coupang_ops_jobs_owner_read" on public.coupang_ops_jobs
  for select to authenticated using (auth.uid() = user_id);
-- 쓰기는 서버(서비스 키)만 — 회원 화면이 상태를 바꾸지 못하게

select to_regclass('public.coupang_ops_defaults') as defaults_table,
       to_regclass('public.coupang_ops_image_links') as image_links_table,
       to_regclass('public.coupang_ops_jobs') as jobs_table;
