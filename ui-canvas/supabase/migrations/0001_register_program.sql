-- UI Canvas 자동화 (slug: ui-canvas) — 프로젝트 저장 테이블 + 프로그램 등록 (v1.01)
-- 공용 Supabase(AIMaster) 한 곳을 쓴다. 회원 본인 프로젝트만 읽고 쓸 수 있다(RLS owner-only).

create table if not exists public.ui_canvas_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '제목 없는 디자인',
  doc jsonb not null default '{}'::jsonb,
  component_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ui_canvas_projects_user_updated_idx
  on public.ui_canvas_projects (user_id, updated_at desc);

alter table public.ui_canvas_projects enable row level security;

drop policy if exists "ui_canvas_projects_owner_select" on public.ui_canvas_projects;
create policy "ui_canvas_projects_owner_select" on public.ui_canvas_projects
  for select using (auth.uid() = user_id);

drop policy if exists "ui_canvas_projects_owner_insert" on public.ui_canvas_projects;
create policy "ui_canvas_projects_owner_insert" on public.ui_canvas_projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "ui_canvas_projects_owner_update" on public.ui_canvas_projects;
create policy "ui_canvas_projects_owner_update" on public.ui_canvas_projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ui_canvas_projects_owner_delete" on public.ui_canvas_projects;
create policy "ui_canvas_projects_owner_delete" on public.ui_canvas_projects
  for delete using (auth.uid() = user_id);

-- 프로그램 등록 (2026-10-13, v1.01)
--  - 카테고리 Tools, 최소 등급 일반, 배지 new(FREE 아님 — 일반 이상 + 관리자 부여 사용기간)
--  - AI는 회원 본인 Gemini 키(user_api_keys)만 사용. 운영자 키 없음.
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'ui-canvas',
  'UI Canvas 자동화',
  'UI 화면을 드래그로 설계하고, 스크린샷에서 AI가 구조를 복원해 PNG·JSON 명세로 내보내는 디자인 캔버스',
  '버튼·입력·탭·차트 등 24종 컴포넌트를 캔버스에 드래그로 배치하고 속성·프리셋·레이어·그룹으로 UI 화면을 설계하는 웹 디자인 캔버스입니다. UI 스크린샷을 올리면 AI가 컴포넌트 구조와 디자인 명세를 만들어 주고, 완성한 화면은 PNG 이미지와 컴포넌트/명세 JSON으로 내보낼 수 있습니다. 프로젝트는 계정별로 자동 저장됩니다. AI 기능은 회원 본인의 Google Gemini API 키로 동작하며 키가 없어도 편집·저장·내보내기는 모두 사용할 수 있습니다.',
  'https://ui-canvas.buylife.xyz',
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
WHERE p.slug = 'ui-canvas'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

-- VIP(드림AI팀)는 모든 프로그램 사용 등급이므로 등급 표에도 추가한다
INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'ui-canvas'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);
