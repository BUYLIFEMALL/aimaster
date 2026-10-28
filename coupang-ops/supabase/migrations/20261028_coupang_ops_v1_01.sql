-- AI 쿠팡 운영 자동화(coupang-ops) v1.01 — 프로그램 등록(C1-1 웹 뼈대)
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 적용은 주인님 승인 뒤 크롬 SQL 편집기에서.
-- 1단계(상품 등록) 출시 전까지 비공개(is_active=false). 회원 데이터 표는 C1-2부터 추가한다.

insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version, detail_sections)
select
  (select id from categories where slug = 'ecommerce'),
  'AI 쿠팡 운영 자동화',
  'coupang-ops',
  '쿠팡 공식 Open API로 상품 등록부터 주문·송장·문의까지 내 쿠팡 판매를 한 화면에서 처리',
  '<p>📦 <strong>쿠팡이 판매자에게 공식으로 주는 WING Open API로, 상품 등록부터 주문·송장·문의까지 내 쿠팡 판매를 한 화면에서 처리합니다.</strong></p>'
  || '<p>🔑 판매자 본인의 Open API 키를 한 번 등록하면 연결 시험으로 키와 허용 IP를 바로 확인합니다. 화면을 대신 누르는 방식이 아니라서 판매자센터 화면이 바뀌어도 멈추지 않습니다.</p>'
  || '<p>🧾 AI 상세페이지 자동화에서 만든 상품을 불러와 카테고리 추천, 필수 고시정보, 옵션, 이미지까지 채우고, 저장만 하거나 승인 요청까지 보낼지 상품마다 고릅니다.</p>'
  || '<p>🚚 이어서 가격·재고 변경, 발주서 확인과 송장 등록, 반품·교환과 고객 문의 처리 기능을 순서대로 엽니다.</p>'
  || '<p>🔒 쿠팡 키는 회원 본인 것만 쓰고, 쿠팡에는 우리 서버의 고정 IP로만 요청합니다. 다른 셀러툴과 동시에 연동할 수 없으며, 쿠팡 승인 심사 결과는 보장하지 않습니다.</p>',
  false,
  0,
  (select id from member_grades where name = '일반'),
  'https://coupang-ops.buylife.xyz',
  array['new']::text[],
  'v1.01',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object('icon', '🔑', 'title', '쿠팡 공식 Open API', 'desc', '화면 조작 없이 쿠팡이 제공하는 판매자 API로 안정적으로 처리합니다.'),
      jsonb_build_object('icon', '📦', 'title', '상세페이지 상품 그대로', 'desc', 'AI 상세페이지 자동화의 상품명·가격·이미지를 다시 입력하지 않습니다.'),
      jsonb_build_object('icon', '🛟', 'title', '저장만 / 승인 요청', 'desc', '상품마다 저장만 할지 승인 요청까지 보낼지 고르고, 중복 등록을 막습니다.'),
      jsonb_build_object('icon', '🚚', 'title', '운영까지 한 곳에서', 'desc', '가격·재고·주문·송장·문의 기능을 순서대로 더합니다.')
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('title', 'WING 키 발급', 'desc', '연동 방식 「자체개발」로 키를 받고 우리 서버 IP를 등록합니다.'),
      jsonb_build_object('title', '키 등록·연결 시험', 'desc', '업체코드·Access Key·Secret Key를 넣고 연결을 확인합니다.'),
      jsonb_build_object('title', '상품 고르기', 'desc', '상세페이지 자동화에서 만든 상품을 고르고 카테고리·옵션을 확인합니다.'),
      jsonb_build_object('title', '등록·결과 확인', 'desc', '저장 또는 승인 요청을 보내고 승인 상태를 확인합니다.')
    ),
    'audiences', jsonb_build_array(
      jsonb_build_object('icon', '🛍', 'title', '쿠팡에 신상품을 자주 올리는 셀러',
        'desc', '상세페이지 상품을 쿠팡 등록 칸에 다시 옮겨 적지 않습니다.',
        'points', jsonb_build_array('다시 입력 없음', '필수값 미리 확인')),
      jsonb_build_object('icon', '🧰', 'title', '셀러툴 없이 직접 운영하는 1인 판매자',
        'desc', '공식 API로 등록·주문·송장을 한 화면에서 처리합니다.',
        'points', jsonb_build_array('판매자 본인 키', '고정 IP 연결')),
      jsonb_build_object('icon', '🛒', 'title', '스마트스토어와 함께 파는 판매자',
        'desc', '같은 상세페이지 상품을 스마트스토어 등록기와 함께 씁니다.',
        'points', jsonb_build_array('상품 하나로 두 마켓', '등록 기록 30일'))
    )
  )
where not exists (select 1 from programs where slug = 'coupang-ops');

insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'coupang-ops'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);

insert into grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from member_grades g, programs p
where g.name = 'VIP(드림AI팀)' and p.slug = 'coupang-ops'
on conflict (grade_id, program_id) do update set can_access = true;

-- 테스트 계정 이용 기간: 2026-10-28 관리자 지시 기본 14일
insert into user_program_access (user_id, program_id, granted_by, expires_at, grant_source)
select u.id, p.id, a.id, now() + interval '14 days', 'manual'
from profiles u, programs p, profiles a
where u.email = 'buylifemall@naver.com' and p.slug = 'coupang-ops' and a.email = 'buylifemall@gmail.com'
  and not exists (select 1 from user_program_access x where x.user_id = u.id and x.program_id = p.id);

select p.slug, p.version, p.is_active, p.app_url, c.slug as category,
  (select count(*) from pricing_plans pp where pp.program_id = p.id) as plans,
  (select count(*) from user_program_access x where x.program_id = p.id) as grants
from programs p join categories c on c.id = p.category_id
where p.slug = 'coupang-ops';
