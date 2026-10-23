-- AI 업무 워크스페이스 자동화 — 카테고리 「업무자동화」 신설 + 프로그램 등록 (2026-10-24)
-- 대상: ① AIMaster 운영 공용 DB (ref esgxyikcnnvmlhygjkth).
-- 주인님 결정: 카테고리 「새 카테고리 「업무자동화」 (추천)」(Tools 바로 앞), 이용 권한 「우선 일반 등급 이상」(FREE 없음),
-- 설명 형식: docs/PROGRAM_DESCRIPTION_STANDARD.md. 기본 요금제 3단계(1·2·3개월 1만/2만/3만원).
-- 다시 실행해도 안전하다(이미 있으면 건너뜀).

-- 1) 카테고리: Tools(16)·백업(17)을 한 칸씩 뒤로 밀고 그 앞(16)에 넣는다
do $$
begin
  if not exists (select 1 from categories where slug = 'work-automation') then
    update categories set sort_order = sort_order + 1 where slug in ('tools', 'backup');
    insert into categories (name, slug, sort_order) values ('업무자동화', 'work-automation', 16);
  end if;
end $$;

-- 2) 프로그램
insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version, detail_sections)
select
  (select id from categories where slug = 'work-automation'),
  'AI 업무 워크스페이스 자동화',
  'ai-work-workspace',
  '문서와 업무 데이터베이스를 한곳에 모아 보드·캘린더·타임라인으로 정리하는 업무 워크스페이스',
  '<p>🗂️ <strong>문서와 업무 데이터베이스를 한 화면에 모아 두는 노션형 업무 워크스페이스입니다.</strong></p>'
  || '<p>✍️ 페이지에서 / 를 누르면 제목·할 일·표·코드·수식 등 블록 41종을 바로 넣고, 끌어서 순서를 바꾸며 회의록·업무 위키·주간 보고를 자유롭게 씁니다.</p>'
  || '<p>📊 업무 데이터베이스는 표·보드·캘린더·타임라인·갤러리·차트 등 12가지 보기로 같은 데이터를 바꿔 보고, 필터·정렬·그룹·수식·관계형 연결로 업무를 정리합니다.</p>'
  || '<p>🔎 제목과 본문을 함께 찾는 검색, 예전 내용으로 되돌리는 버전 기록, 휴지통 복원, Markdown·CSV·HTML 내보내기와 파일 불러오기를 지원합니다.</p>'
  || '<p>🔒 워크스페이스는 회원 본인에게만 보이며 다른 회원과 섞이지 않습니다. 지금은 혼자 쓰는 기능부터 열려 있고, 팀원 초대·공유와 회원 본인 API 키로 쓰는 AI 글쓰기·에이전트는 다음 업데이트에서 차례로 열립니다.</p>',
  true,
  0,
  (select id from member_grades where name = '일반'),
  'https://ai-work-workspace.buylife.xyz',
  array['new']::text[],
  'v1.01',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object('icon', '✍️', 'title', '블록 편집기', 'desc', '/ 메뉴와 마크다운 단축키로 블록 41종을 바로 넣습니다.'),
      jsonb_build_object('icon', '📊', 'title', '데이터베이스 보기 12종', 'desc', '표·보드·캘린더·타임라인·차트로 같은 데이터를 봅니다.'),
      jsonb_build_object('icon', '🔎', 'title', '검색·버전 기록', 'desc', '본문까지 찾고, 예전 내용으로 되돌립니다.'),
      jsonb_build_object('icon', '🔒', 'title', '나만의 워크스페이스', 'desc', '회원마다 분리되어 다른 회원과 섞이지 않습니다.')
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('title', '워크스페이스 만들기', 'desc', '이름만 정하면 업무 공간이 생깁니다.'),
      jsonb_build_object('title', '페이지 쓰기', 'desc', '/ 로 블록을 넣어 문서를 만듭니다.'),
      jsonb_build_object('title', '데이터베이스 정리', 'desc', '보드·캘린더·타임라인으로 봅니다.'),
      jsonb_build_object('title', '찾기·내보내기', 'desc', '검색·버전 기록·파일 내보내기를 씁니다.')
    ),
    'audiences', jsonb_build_array(
      jsonb_build_object('icon', '📝', 'title', '회의록·업무 위키를 정리하는 팀장',
        'desc', '흩어진 회의록과 업무 규칙을 페이지·하위 페이지로 묶고 검색으로 바로 찾습니다.',
        'points', jsonb_build_array('본문까지 찾는 검색', '버전 기록으로 되돌리기')),
      jsonb_build_object('icon', '📅', 'title', '프로젝트 일정을 챙기는 1인 사업자',
        'desc', '같은 업무 목록을 보드로 진행 상황, 타임라인으로 일정, 캘린더로 마감일을 봅니다.',
        'points', jsonb_build_array('보드·타임라인·캘린더 전환', '필터·정렬 보기 저장')),
      jsonb_build_object('icon', '📥', 'title', '흩어진 메모를 한곳에 모으려는 직장인',
        'desc', 'Markdown·CSV·HTML·Word 파일을 불러와 문서와 표로 만들고, 필요하면 다시 내보냅니다.',
        'points', jsonb_build_array('파일 불러오기·내보내기', '표를 데이터베이스로 정리'))
    )
  )
where not exists (select 1 from programs where slug = 'ai-work-workspace');

-- 3) 기본 요금제 3단계
insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'ai-work-workspace'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);
