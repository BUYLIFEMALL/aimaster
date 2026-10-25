-- AI 쇼핑몰 주문·매출 리포트 자동화 — 프로그램 등록 + 기본 요금제 3단계 + VIP 등급 표 + 시험 계정 30일 (2026-10-25, v1.01)
-- 대상: ① AIMaster 운영 공용 DB (ref esgxyikcnnvmlhygjkth). 실행: 크롬 SQL 편집기(주인님 승인 — 플랜 §6).
-- 주인님 결정(2026-10-25): A안 — 주문 데이터는 회원 PC 브라우저에만 보관, 서버 데이터 표 없음. 카테고리 이커머스(ecommerce), 기본 프로그램.
-- 설명 형식: docs/PROGRAM_DESCRIPTION_STANDARD.md. 다시 실행해도 안전하다(이미 있으면 건너뜀).

insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version, detail_sections)
select
  (select id from categories where slug = 'ecommerce'),
  'AI 쇼핑몰 주문·매출 리포트 자동화',
  'shop-order-report',
  '마켓 주문 엑셀을 올리면 주문 현황·매출·순이익·재고 소진·리뷰 개선점을 내 PC 안에서 정리하는 판매 후 리포트',
  '<p>📊 <strong>스마트스토어·쿠팡·11번가·G마켓·옥션 주문 엑셀을 올리면, 실제 주문만으로 내 스토어의 매출과 순이익을 한 화면에 정리합니다.</strong></p>'
  || '<p>📥 판매자센터에서 받은 주문 파일을 여러 개 한꺼번에 올리면 마켓과 열을 알아보고, 같은 주문은 한 번만 셉니다. 못 알아본 열은 한 번만 골라 두면 다음부터 기억합니다.</p>'
  || '<p>💰 일·주·월·상품·마켓별 매출과 정산액을 보고, 상품별 원가·포장비·택배비·광고비를 넣으면 순이익까지 계산합니다. 파일에 정산액이 없으면 마켓 대표 수수료로 추정하고 그 사실을 화면에 표시합니다.</p>'
  || '<p>📉 현재 재고를 넣으면 최근 판매 속도로 며칠 뒤 품절될지 알려 주고, 내 상품 리뷰 파일로 별점 분포·자주 나온 말·불만 리뷰를 모읍니다. 결과는 엑셀로 받거나 인쇄할 수 있습니다.</p>'
  || '<p>🔒 구매자 이름·주소·전화번호 열은 읽자마자 버리고, 주문은 회원님 PC 브라우저에만 보관해 서버로 보내지 않습니다. 리뷰 AI 요약은 선택 기능으로 회원 본인 Gemini 키를 쓰며, 세금 신고·정산 대사는 판매자센터 정산 내역으로 확인해야 합니다.</p>',
  true,
  0,
  (select id from member_grades where name = '일반'),
  'https://shop-order-report.buylife.xyz',
  array['new']::text[],
  'v1.01',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object('icon', '📥', 'title', '여러 마켓 주문 한 번에', 'desc', '마켓·열을 자동으로 알아보고 같은 주문은 한 번만 세며, 맞춘 열은 기억합니다.'),
      jsonb_build_object('icon', '💰', 'title', '원가까지 뺀 순이익', 'desc', '정산액 우선, 없으면 수수료 추정 — 원가·포장·택배·광고비를 빼고 순이익률을 봅니다.'),
      jsonb_build_object('icon', '📉', 'title', '재고 소진 예측', 'desc', '최근 7·14·30일 판매 속도로 상품별 품절까지 남은 날을 알려 줍니다.'),
      jsonb_build_object('icon', '🔒', 'title', '개인정보는 바로 버림', 'desc', '이름·주소·전화 열은 읽지 않고, 주문은 내 PC 브라우저에만 보관합니다.')
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('title', '주문 파일 받기', 'desc', '각 마켓 판매자센터에서 주문 엑셀을 내려받습니다.'),
      jsonb_build_object('title', '올리기·열 확인', 'desc', '끌어 놓고 빠진 열만 골라 주문을 추가합니다.'),
      jsonb_build_object('title', '원가 넣기', 'desc', '상품별 원가·포장비와 택배비·광고비를 넣습니다.'),
      jsonb_build_object('title', '리포트 보기', 'desc', '매출·순이익·재고·리뷰를 보고 엑셀로 받습니다.')
    ),
    'audiences', jsonb_build_array(
      jsonb_build_object('icon', '🛍', 'title', '여러 마켓에 같이 파는 셀러',
        'desc', '스마트스토어와 쿠팡 주문 파일을 함께 올려 마켓별 매출과 순이익을 한 표에서 비교합니다.',
        'points', jsonb_build_array('마켓별 이익 비교', '중복 주문 자동 정리')),
      jsonb_build_object('icon', '📦', 'title', '재고를 직접 관리하는 1인 판매자',
        'desc', '상품별 재고를 넣어 두고 새 주문 파일을 올릴 때마다 품절까지 남은 날을 확인합니다.',
        'points', jsonb_build_array('품절 전에 미리 주문', '잘 팔리는 옵션 확인')),
      jsonb_build_object('icon', '⭐', 'title', '리뷰로 상품을 고치려는 판매자',
        'desc', '내 상품 리뷰 파일에서 불만 리뷰와 자주 나온 말을 모아 상세페이지·포장 개선점을 찾습니다.',
        'points', jsonb_build_array('불만 리뷰 한눈에', '선택 AI 개선점 요약'))
    )
  )
where not exists (select 1 from programs where slug = 'shop-order-report');

insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'shop-order-report'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);

insert into grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from member_grades g, programs p
where g.name = 'VIP(드림AI팀)' and p.slug = 'shop-order-report'
on conflict (grade_id, program_id) do update set can_access = true;

insert into user_program_access (user_id, program_id, granted_by, expires_at, grant_source)
select u.id, p.id, a.id, now() + interval '30 days', 'manual'
from profiles u, programs p, profiles a
where u.email = 'buylifemall@naver.com' and p.slug = 'shop-order-report' and a.email = 'buylifemall@gmail.com'
  and not exists (select 1 from user_program_access x where x.user_id = u.id and x.program_id = p.id);

select p.slug, p.version, p.badges, p.app_url, c.slug as category,
  (select count(*) from pricing_plans pp where pp.program_id = p.id) as plans,
  (select count(*) from user_program_access x where x.program_id = p.id) as grants
from programs p join categories c on c.id = p.category_id
where p.slug = 'shop-order-report';
