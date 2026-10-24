-- AI 부동산 매물 알림 자동화 — 프로그램 등록 + 기본 요금제 3단계 (2026-10-24, v1.01)
-- 대상: ① AIMaster 운영 공용 DB (ref esgxyikcnnvmlhygjkth). 실행: 주인님(크롬 SQL 편집기 Run).
-- 주인님 결정(인수인계 §0): 별도 기본 프로그램(프리미엄 아님), 카테고리 「부동산」(real-estate, 이미 있음).
-- 1단계(뼈대)라 「준비중」(coming) 배지로 등록하고, VIP 등급 자동 부여는 4단계 출시 때 넣는다(ADMIN_POLICY 138행: 정식 공개 시).
-- 확장 칸(extension_version·extension_download_url)은 docs/EXTENSION_RELEASE_RULES.md §4-3에 따라 등록 때 함께 채운다.
-- 설명 형식: docs/PROGRAM_DESCRIPTION_STANDARD.md. 다시 실행해도 안전하다(이미 있으면 건너뜀).

-- 1) 프로그램
insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version, extension_version, extension_download_url, detail_sections)
select
  (select id from categories where slug = 'real-estate'),
  'AI 부동산 매물 알림 자동화',
  'realty-listing-alert',
  '관심 단지의 네이버 부동산 새 매물과 가격 변동을 내 PC가 찾아 텔레그램으로 알려 주는 알림 도구',
  '<p>🏠 <strong>관심 단지에 새 매물이 올라오거나 가격이 내리면, 회원님 PC가 대신 찾아 텔레그램으로 알려 드립니다.</strong></p>'
  || '<p>🎯 감시할 단지를 최대 10개까지 정하고 거래 종류·가격·면적 조건을 걸어 두면, 원하는 매물만 골라 받습니다.</p>'
  || '<p>⏰ 수집 간격(10분~24시간)과 동작 시간대, 예약 켜기·끄기를 직접 정합니다. 짧은 간격은 계정 제한 위험을 화면에서 미리 알려 드립니다.</p>'
  || '<p>📨 새 매물·가격 변동·사라진 매물을 정리해 회원님 본인 텔레그램 봇으로 요약과 엑셀 파일을 보내고, 같은 매물은 한 번만 알립니다.</p>'
  || '<p>🔒 네이버 부동산은 회원님 PC의 크롬 확장이 회원님 계정으로 읽으며, 매물 정보는 우리 서버로 보내지 않습니다. 확인 화면이 나오면 바로 멈춥니다. 지금은 확장 설치·연결이 열려 있고, 감시·예약·알림은 다음 업데이트에서 차례로 열립니다.</p>',
  true,
  0,
  (select id from member_grades where name = '일반'),
  'https://realty-listing-alert.buylife.xyz',
  array['coming']::text[],
  'v1.01',
  'v1.01',
  'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object('icon', '🎯', 'title', '관심 단지 감시', 'desc', '단지를 최대 10개까지 정하고 조건에 맞는 매물만 받습니다.'),
      jsonb_build_object('icon', '⏰', 'title', '내가 정하는 예약', 'desc', '수집 간격·동작 시간대·켜기/끄기를 직접 고릅니다.'),
      jsonb_build_object('icon', '📨', 'title', '텔레그램 알림', 'desc', '새 매물·가격 내림을 요약과 엑셀 파일로 받습니다.'),
      jsonb_build_object('icon', '🔒', 'title', '내 PC에서만 수집', 'desc', '매물 정보는 서버로 가지 않고 회원님 PC에만 남습니다.')
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('title', '확장 설치·연결', 'desc', '사이트에서 확장을 받아 크롬에 설치하고 바로 연결합니다.'),
      jsonb_build_object('title', '텔레그램 봇 연결', 'desc', '본인 봇 토큰을 넣고 연결 시험을 합니다.'),
      jsonb_build_object('title', '감시 대상 추가', 'desc', '단지 주소를 붙여 넣거나 확장에서 추가합니다.'),
      jsonb_build_object('title', '예약 켜기', 'desc', '간격과 시간대를 고르고 예약을 켭니다.')
    ),
    'audiences', jsonb_build_array(
      jsonb_build_object('icon', '🏡', 'title', '내 집 마련을 준비하는 실수요자',
        'desc', '눈여겨 둔 단지 몇 곳에 급매나 가격 내림이 올라오면 출근길 휴대폰으로 바로 확인합니다.',
        'points', jsonb_build_array('가격 내림 알림', '같은 매물 중복 알림 없음')),
      jsonb_build_object('icon', '📈', 'title', '여러 단지를 비교하는 투자자',
        'desc', '최대 10개 단지의 신규·사라진 매물을 엑셀로 모아 받아 흐름을 비교합니다.',
        'points', jsonb_build_array('엑셀 파일 정리', '이전 가격·첫 발견일 기록')),
      jsonb_build_object('icon', '🧑‍💼', 'title', '관심 단지를 챙기는 1인 중개 실무자',
        'desc', '업무 시간대에만 수집하도록 정해 두고, 새로 올라온 매물을 놓치지 않고 확인합니다.',
        'points', jsonb_build_array('동작 시간대 설정', '확인 화면 시 자동 멈춤'))
    )
  )
where not exists (select 1 from programs where slug = 'realty-listing-alert');

-- 2) 기본 요금제 3단계 (1·2·3개월 1만/2만/3만원, components/admin/ProgramForm.tsx DEFAULT_PLANS)
insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'realty-listing-alert'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);

-- 3) 확인
select p.slug, p.version, p.extension_version, p.badges, p.app_url, c.name as category, (select count(*) from pricing_plans pp where pp.program_id = p.id) as plans
from programs p join categories c on c.id = p.category_id
where p.slug = 'realty-listing-alert';
