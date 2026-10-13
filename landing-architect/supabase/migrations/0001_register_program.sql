-- AI 랜딩페이지 기획 자동화 (slug: landing-architect) — 프로젝트 저장 테이블 + 이미지 제공자 키 허용 + 프로그램 등록 (v1.01)
-- 공용 Supabase(AIMaster) 한 곳을 쓴다. 회원 본인 프로젝트만 읽고 쓸 수 있다(RLS owner-only).

create table if not exists public.landing_architect_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '제목 없는 기획',
  inputs jsonb not null default '{}'::jsonb,
  plan jsonb,
  html text not null default '',
  stage text not null default 'input' check (stage in ('input','plan','code')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landing_architect_projects_user_updated_idx
  on public.landing_architect_projects (user_id, updated_at desc);

alter table public.landing_architect_projects enable row level security;

drop policy if exists "landing_architect_projects_owner_select" on public.landing_architect_projects;
create policy "landing_architect_projects_owner_select" on public.landing_architect_projects
  for select using (auth.uid() = user_id);
drop policy if exists "landing_architect_projects_owner_insert" on public.landing_architect_projects;
create policy "landing_architect_projects_owner_insert" on public.landing_architect_projects
  for insert with check (auth.uid() = user_id);
drop policy if exists "landing_architect_projects_owner_update" on public.landing_architect_projects;
create policy "landing_architect_projects_owner_update" on public.landing_architect_projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "landing_architect_projects_owner_delete" on public.landing_architect_projects;
create policy "landing_architect_projects_owner_delete" on public.landing_architect_projects
  for delete using (auth.uid() = user_id);

-- 이미지 제공자 키(회원 본인 키) provider 허용값 확장은 0002에서 현재 제약을 확인한 뒤 적용한다.

-- 프로그램 등록 (v1.01) — 카테고리 Tools, 최소 등급 일반, 배지 new(FREE 아님), AI는 회원 본인 Gemini 키
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'landing-architect',
  'AI 랜딩페이지 기획 자동화',
  '주제·타겟·목표만 입력하면 AI가 랜딩페이지 기획안과 HTML 프로토타입까지 만들어 주는 기획 도구',
  '주제·타겟·목표 3가지를 입력하면 AI가 페이지 구조·콘텐츠 전략·디자인 시스템·이미지 에셋을 담은 기획안을 만들고, 이어서 바로 미리볼 수 있는 단일 HTML 프로토타입을 생성합니다. 20가지 주제 프리셋과 5가지 레이아웃, 섹션별 편집·다시 만들기, 이미지 소스 선택(LoremFlickr·Unsplash·Pexels·Pixabay), 프로젝트 저장과 HTML 내보내기를 지원합니다. AI 기능은 회원 본인의 Google Gemini API 키로 동작합니다.',
  'https://landing-architect.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new']::text[],
  '729e7dd9-571e-4f2b-adb8-0ff941edbea1',
  '861b7a37-d056-4404-80f5-85edb2e2ebff'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, short_desc = EXCLUDED.short_desc, description = EXCLUDED.description,
  app_url = EXCLUDED.app_url, version = EXCLUDED.version, is_active = EXCLUDED.is_active,
  badges = EXCLUDED.badges, category_id = EXCLUDED.category_id, required_grade_id = EXCLUDED.required_grade_id,
  updated_at = NOW();

INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
SELECT p.id, v.name, v.bt, v.price, v.price, true, v.so
FROM public.programs p
CROSS JOIN (VALUES ('1개월','monthly',10000,1), ('2개월','bimonthly',20000,2), ('3개월','quarterly',30000,3)) AS v(name, bt, price, so)
WHERE p.slug = 'landing-architect'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'landing-architect'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);
