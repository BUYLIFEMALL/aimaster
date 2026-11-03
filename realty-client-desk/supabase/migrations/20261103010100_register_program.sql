-- AI 중개사무소 고객관리 프로그램 등록 + 기본 요금제 3단계 + 시험 계정 14일 권한 (2026-11-03, v1.01)
-- 대상: AIMaster 운영 DB esgxyikcnnvmlhygjkth. 「준비중」으로 등록(결정 3: 시험 계정 검수 뒤 주인님 확인으로 공개).
insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version, detail_sections)
select
  (select id from categories where slug = 'real-estate'),
  'AI 중개사무소 고객관리 자동화',
  'realty-client-desk',
  '매수·임대 관심고객을 동의와 함께 모으고 조건별로 정리하는 공인중개사무소 고객 명부입니다.',
  '<p>🏢 <strong>공인중개사무소의 매수·임대 관심고객을, 개인정보 동의 기록과 함께 한곳에 모읍니다.</strong></p>'
  || '<p>🔗 사무소 전용 접수 링크를 만들어 문자나 블로그에 붙이면, 고객이 직접 원하는 거래·지역·유형·예산·입주 시기를 남깁니다. 로그인할 필요가 없습니다.</p>'
  || '<p>✅ 고객은 수집 목적·항목·보관 기간·거부 권리를 읽고 동의해야 접수할 수 있고, 매물 안내 문자 수신은 따로 고릅니다. 동의 일시와 문구 판이 함께 남습니다.</p>'
  || '<p>👥 전화·방문으로 받은 고객은 직접 넣을 수 있으며, 이때도 동의를 받았다는 확인과 방법·날짜를 남겨야 저장됩니다. 고객 목록은 거래 종류·상태로 거르고 언제든 지울 수 있습니다.</p>'
  || '<p>⚠️ 고객 명부는 회원님 사무소만 볼 수 있고, 마지막 상담일부터 1년 보관합니다. 사무소 개인정보 처리방침에 보관 위탁 사실을 적어 주세요. 안내 문구는 참고용이며 법률 자문이 아닙니다.</p>',
  true,
  0,
  (select id from member_grades where name = '일반'),
  'https://realty-client-desk.buylife.xyz',
  array['coming']::text[],
  'v1.01',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object('icon', '🔗', 'title', '사무소 전용 접수 링크', 'desc', '고객이 로그인 없이 조건과 동의를 직접 남깁니다.'),
      jsonb_build_object('icon', '✅', 'title', '동의 기록', 'desc', '수집 동의·광고 수신 동의 일시와 문구 판을 남깁니다.'),
      jsonb_build_object('icon', '👥', 'title', '관심고객 명부', 'desc', '거래 종류·상태로 거르고 메모를 남깁니다.'),
      jsonb_build_object('icon', '🔒', 'title', '사무소별 격리', 'desc', '내 사무소 고객만 보이고 1년 뒤 정리합니다.')
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('title', '접수 링크 만들기', 'desc', '사무소 이름·전화를 넣고 링크를 만듭니다.'),
      jsonb_build_object('title', '링크 공유', 'desc', '문자·블로그·명함 QR에 링크를 붙입니다.'),
      jsonb_build_object('title', '고객 접수 확인', 'desc', '관심고객 목록에서 조건과 동의 기록을 봅니다.'),
      jsonb_build_object('title', '직접 입력·정리', 'desc', '전화 고객은 동의 확인과 함께 넣고 상태를 바꿉니다.')
    ),
    'audiences', jsonb_build_array(
      jsonb_build_object('icon', '🧑‍💼', 'title', '고객 명단을 수첩·엑셀로 관리하던 개업공인중개사',
        'desc', '흩어진 매수·임대 문의를 조건별 명부로 모으고, 누가 언제 동의했는지 함께 남깁니다.',
        'points', jsonb_build_array('동의 기록', '조건별 거르기')),
      jsonb_build_object('icon', '📱', 'title', '블로그·문자로 문의를 받는 사무소',
        'desc', '접수 링크 하나로 고객이 직접 조건을 적게 해 통화 시간을 줄입니다.',
        'points', jsonb_build_array('로그인 없는 접수', '사무소 이름 표시')),
      jsonb_build_object('icon', '🏘️', 'title', '임대 만기·재계약 고객이 많은 사무소',
        'desc', '고객 상태(상담 중·보류·계약·종료)를 한눈에 보고 다음 연락을 챙깁니다.',
        'points', jsonb_build_array('상태 관리', '마지막 상담일'))
    )
  )
where not exists (select 1 from programs where slug = 'realty-client-desk');

insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'realty-client-desk'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);

-- 시험 계정 14일(테스트 이용기간 기본값)
insert into user_program_access (user_id, program_id, granted_by, expires_at, grant_source)
select u.id, p.id, a.id, now() + interval '14 days', 'manual'
from profiles u, programs p, profiles a
where u.email = 'buylifemall@naver.com' and p.slug = 'realty-client-desk' and a.email = 'buylifemall@gmail.com'
  and not exists (select 1 from user_program_access x where x.user_id = u.id and x.program_id = p.id);
