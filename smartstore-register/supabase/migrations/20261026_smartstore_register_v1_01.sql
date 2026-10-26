-- 스마트스토어 상품등록 자동화 v1.01 (EC-W8 1단계) — 대상: ① AIMaster 운영 공용 DB (ref esgxyikcnnvmlhygjkth)
-- 회원별 스토어 기본값 1행 + 등록 작업 기록(30일 자동 정리) + 프로그램 등록. 모두 본인 행만(RLS). 다시 실행해도 안전.
-- 프로그램 등록은 shop-order-report(20261025000100) 방식과 같음.

create table if not exists public.smartstore_register_defaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.smartstore_register_defaults enable row level security;
drop policy if exists "ssr_defaults_owner" on public.smartstore_register_defaults;
create policy "ssr_defaults_owner" on public.smartstore_register_defaults
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.smartstore_register_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  mode text not null check (mode in ('fill_only','temp_save','register')),
  status text not null default 'queued' check (status in ('queued','running','filled','temp_saved','registered','failed','canceled')),
  category_keyword text not null default '',
  steps jsonb not null default '[]'::jsonb,
  market_product_no text,
  failed_step text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists smartstore_register_jobs_user_idx on public.smartstore_register_jobs (user_id, created_at desc);
alter table public.smartstore_register_jobs enable row level security;
drop policy if exists "ssr_jobs_owner" on public.smartstore_register_jobs;
create policy "ssr_jobs_owner" on public.smartstore_register_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version, detail_sections)
select
  (select id from categories where slug = 'ecommerce'),
  '스마트스토어 상품등록 자동화',
  'smartstore-register',
  'AI 상세페이지로 만든 상품을 크롬 확장이 스마트스토어 상품 등록 화면에 대신 채워 넣는 등록 도우미',
  '<p>🛒 <strong>AI 상세페이지 자동화로 만든 상품을, 크롬 확장이 스마트스토어센터 「상품 등록」 화면에 칸마다 대신 채워 넣습니다.</strong></p>'
  || '<p>📦 상세페이지 자동화의 내 상품을 그대로 불러옵니다. 상품명·정상가·할인가·대표 사진·섹션 이미지를 다시 입력하지 않고, 스마트스토어 칸에 들어갈 값과 빠진 필수값을 미리 확인합니다.</p>'
  || '<p>⚙ 원산지·A/S 전화·배송 템플릿 이름·상품정보제공고시 상품군처럼 매번 같은 값은 「스토어 기본값」에 한 번만 넣어 두면 모든 상품에 함께 쓰입니다.</p>'
  || '<p>🧩 등록 방식은 상품마다 고릅니다. 「입력만」은 칸만 채우고 저장은 회원이 누르며, 「임시저장까지」는 실제 상품을 만들지 않고 판매자센터에 임시 저장합니다. 「바로 등록」은 기본으로 전시중지 상태로 올립니다.</p>'
  || '<p>🔒 판매자센터 로그인은 회원이 직접 하고, 확장은 회원 본인 크롬에서만 움직입니다. 비밀번호나 판매자 키를 맡기지 않으며, 등록 결과와 실패한 칸은 「등록 기록」에 30일 동안 남습니다. 판매자센터 화면이 바뀌면 일부 칸은 직접 확인해야 할 수 있습니다.</p>',
  true,
  0,
  (select id from member_grades where name = '일반'),
  'https://smartstore-register.buylife.xyz',
  array['new']::text[],
  'v1.01',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object('icon', '📦', 'title', '상세페이지 상품 그대로', 'desc', 'AI 상세페이지 자동화에서 만든 상품명·가격·사진·섹션 이미지를 다시 입력하지 않습니다.'),
      jsonb_build_object('icon', '🧩', 'title', '칸마다 대신 입력', 'desc', '크롬 확장이 카테고리·상품명·판매가·재고·고시·A/S 칸을 순서대로 채웁니다.'),
      jsonb_build_object('icon', '🛟', 'title', '안전한 등록 방식', 'desc', '입력만·임시저장까지·바로 등록(전시중지) 중 상품마다 고릅니다.'),
      jsonb_build_object('icon', '🧾', 'title', '결과와 실패한 칸 기록', 'desc', '상품번호·멈춘 칸·이유를 모아 보고 나머지만 직접 고칩니다.')
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('title', '스토어 기본값', 'desc', '원산지·A/S 전화·배송 템플릿 이름을 한 번 넣습니다.'),
      jsonb_build_object('title', '상품 고르기', 'desc', '상세페이지 자동화에서 만든 상품을 고르고 카테고리 검색어를 넣습니다.'),
      jsonb_build_object('title', '확장으로 보내기', 'desc', '등록 방식을 고르고 판매자센터에 로그인된 크롬에서 실행합니다.'),
      jsonb_build_object('title', '결과 확인', 'desc', '등록 기록에서 입력 완료·상품번호·실패한 칸을 봅니다.')
    ),
    'audiences', jsonb_build_array(
      jsonb_build_object('icon', '🛍', 'title', '상세페이지를 AI로 만드는 셀러',
        'desc', '만든 상세페이지를 판매자센터에 옮겨 적는 시간을 줄입니다.',
        'points', jsonb_build_array('다시 입력 없음', '섹션 이미지 순서 유지')),
      jsonb_build_object('icon', '📦', 'title', '신상품을 자주 올리는 1인 판매자',
        'desc', '매번 같은 원산지·A/S·배송 값을 기본값으로 묶어 둡니다.',
        'points', jsonb_build_array('기본값 한 번', '빠진 필수값 미리 확인')),
      jsonb_build_object('icon', '🧪', 'title', '처음 자동 등록을 써 보는 분',
        'desc', '임시저장까지 방식으로 실제 상품 없이 먼저 확인합니다.',
        'points', jsonb_build_array('실제 상품 안 생김', '실패한 칸 표시'))
    )
  )
where not exists (select 1 from programs where slug = 'smartstore-register');

insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'smartstore-register'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);

insert into grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from member_grades g, programs p
where g.name = 'VIP(드림AI팀)' and p.slug = 'smartstore-register'
on conflict (grade_id, program_id) do update set can_access = true;

insert into user_program_access (user_id, program_id, granted_by, expires_at, grant_source)
select u.id, p.id, a.id, now() + interval '30 days', 'manual'
from profiles u, programs p, profiles a
where u.email = 'buylifemall@naver.com' and p.slug = 'smartstore-register' and a.email = 'buylifemall@gmail.com'
  and not exists (select 1 from user_program_access x where x.user_id = u.id and x.program_id = p.id);

select p.slug, p.version, p.app_url, c.slug as category,
  (select count(*) from pricing_plans pp where pp.program_id = p.id) as plans,
  (select count(*) from user_program_access x where x.program_id = p.id) as grants,
  to_regclass('public.smartstore_register_jobs') as jobs_table,
  to_regclass('public.smartstore_register_defaults') as defaults_table
from programs p join categories c on c.id = p.category_id
where p.slug = 'smartstore-register';
