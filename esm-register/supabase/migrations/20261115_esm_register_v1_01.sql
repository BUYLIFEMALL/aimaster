-- AI G마켓·옥션 상품 자동등록기 v1.01 — 대상: ① AIMaster 운영 공용 DB (ref esgxyikcnnvmlhygjkth)
-- 플랜 docs/PLAN_20261115_ESM_EXTENSION.md (주인님 결정 2026-11-15 「추천대로 진행해」: 새 표 4개, 검수 뒤 공개)
-- 구조는 smartstore-register(v1.01·v1.02·v1.23)와 같음. 모두 본인 행만(RLS), 확장 토큰은 서버만. 다시 실행해도 안전.
-- 검수 전 비공개: 카테고리 「백업」(categories.is_public=false — 관리자·내부 열람 계정만 보임). 공개할 때 ecommerce로 옮긴다.

create table if not exists public.esm_register_defaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.esm_register_defaults enable row level security;
drop policy if exists "esm_defaults_owner" on public.esm_register_defaults;
create policy "esm_defaults_owner" on public.esm_register_defaults
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.esm_register_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  mode text not null check (mode in ('fill_only','temp_save','register')),
  status text not null default 'queued' check (status in ('queued','running','filled','temp_saved','registered','failed','canceled')),
  category_keyword text not null default '',
  steps jsonb not null default '[]'::jsonb,
  market_product_no text,          -- 「G:123,A:456」 G마켓·옥션 상품번호
  fee_note text,                   -- 카테고리 고른 뒤 화면에 보인 기본이용료(예: 13%)
  failed_step text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists esm_register_jobs_user_idx on public.esm_register_jobs (user_id, created_at desc);
alter table public.esm_register_jobs enable row level security;
drop policy if exists "esm_jobs_owner" on public.esm_register_jobs;
create policy "esm_jobs_owner" on public.esm_register_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.esm_register_ext_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text unique,
  pair_code text unique,
  pair_code_expires_at timestamptz,
  device_name text not null default 'Chrome',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists esm_register_ext_tokens_user_idx on public.esm_register_ext_tokens (user_id);
alter table public.esm_register_ext_tokens enable row level security;   -- 회원 정책 없음 = 서버(service role)만

create table if not exists public.esm_register_health (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','ok','changed','failed')),
  ext_version text,
  checked_total int,
  missing jsonb,
  conditional jsonb,
  store_name text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists esm_register_health_user_idx on public.esm_register_health (user_id, created_at desc);
alter table public.esm_register_health enable row level security;
drop policy if exists "esm_health_owner" on public.esm_register_health;
create policy "esm_health_owner" on public.esm_register_health
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version, detail_sections, extension_version, extension_download_url)
select
  (select id from categories where slug = 'backup'),
  'AI G마켓·옥션 상품 자동등록기',
  'esm-register',
  'AI 상세페이지 상품을 크롬 확장이 ESM+ 등록 화면에 채워 G마켓·옥션에 한 번에 올리는 등록 도우미',
  '<p>🛒 <strong>AI 상세페이지 자동화로 만든 상품을, 크롬 확장이 ESM+ 「상품등록」 화면에 칸마다 채워 G마켓과 옥션에 한 번에 올립니다.</strong></p>'
  || '<p>📦 상세페이지 자동화의 내 상품을 그대로 불러옵니다. 상품명·판매가·대표 사진·추가 사진·상세 섹션 이미지를 다시 입력하지 않고, 빠진 필수값을 보내기 전에 미리 알려 줍니다.</p>'
  || '<p>⚙ 택배사·발송정책·출고지·배송비 정책·반품지처럼 매번 같은 값은 「기본값」에 한 번 적어 두면 모든 상품에 함께 쓰입니다. 상품정보 제공고시는 상품군만 고르면 상세설명 참조로 한 번에 채웁니다.</p>'
  || '<p>🧩 등록 방식은 상품마다 고릅니다. 「입력만」은 칸만 채우고 저장은 회원이 누르며, 「임시저장까지」는 실제 상품 없이 ESM+에 임시 저장하고, 「바로 등록」은 확인 상자를 체크해야 보냅니다.</p>'
  || '<p>🔒 ESM+ 로그인은 회원이 직접 하고 확장은 회원 본인 크롬에서만 움직입니다. 비밀번호나 API 키를 맡기지 않으며, 등록 결과·상품번호·멈춘 칸은 「등록 기록」에 30일 동안 남습니다. ESM+ 화면이 바뀌면 일부 칸은 직접 확인해야 할 수 있습니다.</p>',
  true,
  0,
  (select id from member_grades where name = '일반'),
  'https://esm-register.buylife.xyz',
  array['new']::text[],
  'v1.01',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object('icon', '🛒', 'title', '두 마켓 한 번에', 'desc', 'ESM+ 한 화면에서 G마켓·옥션에 같은 상품을 함께 올립니다.'),
      jsonb_build_object('icon', '📦', 'title', '상세페이지 상품 그대로', 'desc', '상세페이지 자동화의 상품명·가격·사진·섹션 이미지를 다시 입력하지 않습니다.'),
      jsonb_build_object('icon', '🧾', 'title', '고시는 한 번에', 'desc', '상품군을 고르면 상세설명 참조로 고시 항목을 한꺼번에 채웁니다.'),
      jsonb_build_object('icon', '🛟', 'title', '안전한 등록 방식', 'desc', '입력만·임시저장까지·바로 등록 중 상품마다 고르고 결과를 기록합니다.')
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('title', '기본값', 'desc', '택배사·발송정책·출고지·배송비 정책 번호를 한 번 적습니다.'),
      jsonb_build_object('title', '상품 고르기', 'desc', '상세페이지 자동화에서 만든 상품과 카테고리 검색어를 고릅니다.'),
      jsonb_build_object('title', '확장으로 보내기', 'desc', 'ESM+에 로그인된 크롬에서 확장이 칸을 채웁니다.'),
      jsonb_build_object('title', '결과 확인', 'desc', '등록 기록에서 상품번호·수수료·멈춘 칸을 봅니다.')
    ),
    'audiences', jsonb_build_array(
      jsonb_build_object('icon', '🛍', 'title', '스마트스토어 다음 마켓을 여는 셀러',
        'desc', '같은 상세페이지 상품을 G마켓·옥션에도 바로 올립니다.',
        'points', jsonb_build_array('두 마켓 동시', '다시 입력 없음')),
      jsonb_build_object('icon', '📦', 'title', '배송 설정이 늘 같은 판매자',
        'desc', 'ESM+에 만들어 둔 배송비 정책을 기본값으로 묶어 둡니다.',
        'points', jsonb_build_array('기본값 한 번', '빠진 값 미리 확인')),
      jsonb_build_object('icon', '🧪', 'title', '처음 G마켓에 올려 보는 분',
        'desc', '임시저장까지로 실제 상품 없이 먼저 확인합니다.',
        'points', jsonb_build_array('실제 상품 안 생김', '수수료 미리 보기'))
    )
  ),
  'v1.01',
  'https://esm-register.buylife.xyz/downloads/esm-register-extension-latest.zip'
where not exists (select 1 from programs where slug = 'esm-register');

insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'esm-register'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);

-- 시험 계정 14일(관리자 승인 테스트 기본 기간)
insert into user_program_access (user_id, program_id, granted_by, expires_at, grant_source)
select u.id, p.id, a.id, now() + interval '14 days', 'manual'
from profiles u, programs p, profiles a
where u.email = 'buylifemall@naver.com' and p.slug = 'esm-register' and a.email = 'buylifemall@gmail.com'
  and not exists (select 1 from user_program_access x where x.user_id = u.id and x.program_id = p.id);

select p.slug, p.version, p.app_url, c.slug as category, c.is_public,
  (select count(*) from pricing_plans pp where pp.program_id = p.id) as plans,
  to_regclass('public.esm_register_jobs') as jobs, to_regclass('public.esm_register_defaults') as defaults,
  to_regclass('public.esm_register_ext_tokens') as tokens, to_regclass('public.esm_register_health') as health
from programs p join categories c on c.id = p.category_id
where p.slug = 'esm-register';
