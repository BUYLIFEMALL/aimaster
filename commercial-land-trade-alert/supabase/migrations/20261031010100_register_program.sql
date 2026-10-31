-- 상가·건물·토지 실거래 알림 프로그램 등록 + 기본 요금제 3단계 + 시험 계정 14일 권한 (2026-10-31, v1.01)
-- 대상: AIMaster 운영 DB esgxyikcnnvmlhygjkth. 「준비중」으로 등록한다. VIP 자동 부여는 정식 공개 때.
insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version, detail_sections)
select
  (select id from categories where slug = 'real-estate'),
  '상가·건물·토지 실거래 알림',
  'commercial-land-trade-alert',
  '상가·건물·토지 실거래를 지역과 조건별로 모아 보고, 새 거래를 텔레그램으로 받습니다.',
  '<p>🏢 <strong>아파트가 아닌 상가·건물·토지의 실거래를, 수집 작업 없이 지역과 조건만 골라 받아 봅니다.</strong></p>'
  || '<p>📍 전국 시·군·구 256곳에서 관심 지역을 고르면 서버가 국토교통부 공개 자료를 지역마다 하루 1회 자동으로 받아 옵니다. 설치할 것도 직접 수집할 것도 없습니다.</p>'
  || '<p>🎯 건물 용도, 토지 지목, 금액, 면적으로 원하는 거래만 고릅니다. 건수가 많은 숙박·도로와 지분 거래는 기본으로 빼 두었고 필요하면 켤 수 있습니다.</p>'
  || '<p>📊 목록에서 거르고 정렬한 뒤 CSV로 받을 수 있고, 상세 화면에서는 같은 동·같은 분류의 최근 12개월 평당가 중간값과 비교합니다. 취소·지분 거래는 비교에서 뺍니다.</p>'
  || '<p>📨 조건에 맞는 새 거래는 회원님 본인 텔레그램 봇으로 알려 드립니다. 다른 프로그램에 연결한 봇이 있으면 그대로 쓰며, AI 키나 공공데이터 키는 필요 없습니다.</p>'
  || '<p>⚠️ 토지와 일반 건물은 국토부가 지번 일부를 가려 제공하고, 임대료·수익률은 자료에 없습니다. 공개 신고 자료를 정리한 참고 정보이며 투자 결과를 보증하지 않습니다.</p>',
  true,
  0,
  (select id from member_grades where name = '일반'),
  'https://commercial-land-trade-alert.buylife.xyz',
  array['coming']::text[],
  'v1.01',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object('icon', '🤖', 'title', '직접 수집 없음', 'desc', '지역만 고르면 서버가 하루 1회 공개 자료를 받아 옵니다.'),
      jsonb_build_object('icon', '🎯', 'title', '용도·지목 거르기', 'desc', '건물 용도, 토지 지목, 금액, 면적으로 고릅니다.'),
      jsonb_build_object('icon', '📊', 'title', '같은 동 평당가 비교', 'desc', '최근 12개월 중간값과 비교하고 취소·지분은 뺍니다.'),
      jsonb_build_object('icon', '📨', 'title', '텔레그램 알림', 'desc', '조건에 맞는 새 거래를 본인 봇으로 받습니다.')
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('title', '관심 지역 고르기', 'desc', '전국 시·군·구에서 볼 곳을 누릅니다.'),
      jsonb_build_object('title', '거래 조건 정하기', 'desc', '상가·건물과 토지, 용도·지목, 금액·면적을 고릅니다.'),
      jsonb_build_object('title', '텔레그램 연결', 'desc', '본인 봇 토큰을 넣거나 이미 연결한 봇을 그대로 씁니다.'),
      jsonb_build_object('title', '실거래 확인', 'desc', '목록에서 거르고 상세에서 같은 동과 비교합니다.')
    ),
    'audiences', jsonb_build_array(
      jsonb_build_object('icon', '🏪', 'title', '상가·꼬마빌딩 매입을 알아보는 분',
        'desc', '관심 동네의 근린생활·판매·업무 시설 거래가를 건물 용도별로 모아 시세 감을 잡습니다.',
        'points', jsonb_build_array('건물 용도 거르기', '평당가 비교')),
      jsonb_build_object('icon', '🌳', 'title', '토지 거래를 지켜보는 분',
        'desc', '지목과 면적을 정해 두고 전·답·임야·대지의 새 거래를 알림으로 받습니다.',
        'points', jsonb_build_array('지목별 알림', '지분 거래 구분')),
      jsonb_build_object('icon', '🧑‍💼', 'title', '상업용 부동산을 다루는 실무자',
        'desc', '담당 지역의 거래를 CSV로 받아 고객 자료나 시장 보고에 활용합니다.',
        'points', jsonb_build_array('CSV 내려받기', '여러 지역 한곳에서'))
    )
  )
where not exists (select 1 from programs where slug = 'commercial-land-trade-alert');

insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'commercial-land-trade-alert'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);

-- 시험 계정 14일(테스트 이용기간 기본값)
insert into user_program_access (user_id, program_id, granted_by, expires_at, grant_source)
select u.id, p.id, a.id, now() + interval '14 days', 'manual'
from profiles u, programs p, profiles a
where u.email = 'buylifemall@naver.com' and p.slug = 'commercial-land-trade-alert' and a.email = 'buylifemall@gmail.com'
  and not exists (select 1 from user_program_access x where x.user_id = u.id and x.program_id = p.id);
