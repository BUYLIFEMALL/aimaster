-- AI 11번가 상품 자동등록기(elevenst-register) v1.01 — 프로그램 등록 + 등록 기록 표
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 주인님 승인(2026-11-11 「진행해」) 뒤 ego SQL 편집기에서 실행.
-- 비공개(is_active=false)로 등록 — 상품 등록 기능과 실물 시험이 끝난 뒤 주인님 확인으로 공개. 상세 소개(detail_sections)·썸네일은 공개 직전에.
-- 회원 데이터는 본인 행만(RLS). 등록 기록은 30일 뒤 정리(정리 작업은 4단계에서, 관리자·시험 계정 retention_exempt 열외).

-- 1) 프로그램 1줄
insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version)
select
  (select id from categories where slug = 'ecommerce'),
  'AI 11번가 상품 자동등록기',
  'elevenst-register',
  '상세페이지에서 만든 상품을 11번가 공식 Seller API로 바로 등록하는 판매자용 자동 등록기',
  '<p>🏪 <strong>상세페이지에서 만든 상품을 11번가가 판매자에게 공식으로 주는 Seller API로 바로 등록합니다.</strong></p>'
  || '<p>📦 AI 상세페이지 자동화에서 상품을 검토 완료하면, 상품명·가격·대표 이미지·상세 이미지를 그대로 가져와 11번가 카테고리와 배송 정보만 고르면 됩니다.</p>'
  || '<p>🔎 보내기 전에 11번가 규칙(카테고리 최하위 선택, 옵션 특수문자, 이미지 형식, 한글 글자 표기)을 먼저 검사해 등록 실패를 줄입니다.</p>'
  || '<p>🧾 등록 결과와 11번가 상품번호를 기록하고, 등록 직후 전시중지를 함께 걸어 두고 확인한 뒤 판매를 시작할 수 있습니다.</p>'
  || '<p>🔑 11번가 API 키와 고정 IP는 회원님 본인 것만 씁니다. 결과가 확실하지 않으면 자동으로 다시 보내지 않으니 등록 기록에서 확인해 주세요.</p>',
  false,
  0,
  (select id from member_grades where name = '일반'),
  'https://elevenst-register.buylife.xyz',
  array['coming']::text[],
  'v1.01'
where not exists (select 1 from programs where slug = 'elevenst-register');

-- 2) 기본 요금제 3단계(1·2·3개월)
insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'elevenst-register'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);

-- 3) 등록 기록(보낸 본문 요약·11번가 응답·상품번호·전시 상태). 쓰기는 서버(서비스 키)만.
create table if not exists public.elevenst_register_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid,
  product_name text not null default '',
  category_no text,
  status text not null default 'sending' check (status in ('sending', 'registered', 'stopped', 'failed', 'unknown')),
  elevenst_product_no bigint,
  stop_display boolean not null default true,
  message text,
  response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists elevenst_register_jobs_user on public.elevenst_register_jobs (user_id, created_at desc);
create index if not exists elevenst_register_jobs_product on public.elevenst_register_jobs (user_id, product_id, created_at desc);
alter table public.elevenst_register_jobs enable row level security;
drop policy if exists "elevenst_register_jobs_owner_read" on public.elevenst_register_jobs;
create policy "elevenst_register_jobs_owner_read" on public.elevenst_register_jobs
  for select to authenticated using (auth.uid() = user_id);

-- 확인
select (select count(*) from programs where slug = 'elevenst-register') as program_rows,
       (select count(*) from pricing_plans pp join programs p on p.id = pp.program_id where p.slug = 'elevenst-register') as plan_rows,
       to_regclass('public.elevenst_register_jobs') as jobs_table;
