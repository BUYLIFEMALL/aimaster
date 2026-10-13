-- v1.01 핵심 기록 기능: 공통 카탈로그/기본 요금제/VIP 정책 연결.
-- 회원 본인 키를 사용하는 AI 분석은 후속 단계이며 현재 호출 기능이 없다.
begin;

insert into public.programs
  (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
values (
  'ai-task-planner', 'AI 할 일·성과 관리',
  '날짜별 할 일과 집중·휴식 시간을 기록하고 성과 차트·노트·JSON 백업을 관리합니다.',
  '<h2>할 일과 실제 집중 기록을 함께 관리합니다</h2><p>날짜별 할 일, 분류, 우선순위, 예상 시간을 등록하고 완료·취소 및 휴지통 복원을 이용할 수 있습니다. 집중·짧은 휴식·긴 휴식 타이머는 일시정지와 재개를 지원하며, 할 일을 완료하면 진행 중인 타이머를 함께 종료합니다.</p><h3>회원별 기록 보존과 성과 확인</h3><p>본인 계정에 저장한 기록을 다시 조회하고 날짜·분류·검색 범위에 맞는 완료율, 집중 시간, 예상 시간 대비 실제 집중 시간과 시간대 차트를 확인합니다. 노트는 저장 버튼으로 명시적으로 저장하며 전체 기록을 JSON 파일로 다운로드할 수 있습니다.</p><h3>현재 제공 범위</h3><p>v1.01은 할 일·타이머·기록·성과 집계의 핵심 기능을 제공합니다. AI 분석, Gemini 모델 선택, 전체 백업 복원과 CSV 다운로드는 준비 중입니다. AI 기능을 연결할 때는 회원 본인의 Gemini API 키만 사용하며 운영자나 다른 회원의 키로 대신 처리하지 않습니다.</p><h3>이용 방법</h3><p>AIMaster 로그인 후 공통 프로그램 이용 권한을 확인합니다. 별도 회원가입이나 외부 계정 연동은 필요하지 않으며 기본 기록 기능에는 AI API 호출이 없습니다.</p>',
  'https://ai-task-planner.buylife.xyz', 'v1.01', true, array['new']::text[],
  (select id from public.categories where slug = 'tools'),
  (select id from public.member_grades where name = '일반')
)
on conflict (slug) do update set
  name = excluded.name, short_desc = excluded.short_desc, description = excluded.description,
  app_url = excluded.app_url, version = excluded.version, is_active = excluded.is_active,
  badges = excluded.badges, category_id = excluded.category_id, required_grade_id = excluded.required_grade_id,
  updated_at = now();

insert into public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from public.programs p
cross join (values ('1개월','monthly',10000,1),('2개월','bimonthly',20000,2),('3개월','quarterly',30000,3)) v(name,billing_type,price,sort_order)
where p.slug = 'ai-task-planner'
  and not exists (select 1 from public.pricing_plans pp where pp.program_id = p.id and pp.billing_type = v.billing_type);

insert into public.grade_program_access (grade_id, program_id)
select g.id, p.id from public.member_grades g cross join public.programs p
where g.name like 'VIP%' and p.slug = 'ai-task-planner'
  and not exists (select 1 from public.grade_program_access a where a.grade_id = g.id and a.program_id = p.id);

commit;
