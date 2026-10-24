-- 셀러 라벨·QR·서류 자동화 — 프로그램 등록 + 기본 요금제 3단계 + VIP 등급 표 + 시험 계정 30일 (2026-10-25, v1.01)
-- 대상: ① AIMaster 운영 공용 DB (ref esgxyikcnnvmlhygjkth). 실행: 크롬 SQL 편집기(주인님 승인 — 플랜 §5).
-- 주인님 결정(쇼핑몰 묶음 인계 D8·D9): 새 기본 프로그램(프리미엄 아님, 운영자 비용 없음), 카테고리 이커머스(ecommerce).
-- 설명 형식: docs/PROGRAM_DESCRIPTION_STANDARD.md. 다시 실행해도 안전하다(이미 있으면 건너뜀).

-- 1) 프로그램
insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version, detail_sections)
select
  (select id from categories where slug = 'ecommerce'),
  '셀러 라벨·QR·서류 자동화',
  'seller-label-docs',
  'A4 라벨 인쇄·QR·사진 이름 정리·PDF 정리·문서 서명을 내 PC 안에서 처리하는 판매자 도구함',
  '<p>🏷 <strong>출고 라벨부터 입점 서류까지, 판매자가 반복하는 서류 작업 5가지를 내 PC 브라우저 안에서 끝내는 도구함입니다.</strong></p>'
  || '<p>📋 A4 라벨지 규격을 고르거나 직접 입력하고, 엑셀 표를 넣으면 칸마다 상품명·주소·가격·바코드·QR이 다르게 채워집니다. 쓰다 남은 라벨지는 시작 칸을 골라 이어서 쓰고, 식품 한글표시사항 틀도 제공합니다.</p>'
  || '<p>🔳 스토어·리뷰 주소를 색과 점 모양을 꾸민 QR로 만들고, 휴대폰이 읽을 수 있는 대비인지 바로 알려 드립니다. 상품 사진 여러 장은 「공통 이름 + 순번」으로 한 번에 이름을 바꿔 ZIP으로 받습니다.</p>'
  || '<p>📄 사진을 PDF로 묶고, 여러 PDF를 합치거나 필요한 페이지만 골라 순서를 바꾸고 돌리고 나눕니다. 손글씨·서명 사진·이름 글자를 PDF나 사진 위 원하는 자리에 넣을 수도 있습니다.</p>'
  || '<p>🔒 파일은 서버로 올라가지 않고 이 PC에서만 처리되며, AI·API 키나 외부 계정이 필요 없습니다. 서명은 그림을 얹는 기능으로 법적 효력이 있는 전자서명이 아니고, 바코드 번호와 식품 표시 내용은 판매자가 직접 확인해야 합니다.</p>',
  true,
  0,
  (select id from member_grades where name = '일반'),
  'https://seller-label-docs.buylife.xyz',
  array['new']::text[],
  'v1.01',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object('icon', '📋', 'title', '엑셀로 라벨 대량 채우기', 'desc', '표의 열 이름을 {상품명}처럼 넣으면 칸마다 다른 내용·바코드·QR이 들어갑니다.'),
      jsonb_build_object('icon', '🎯', 'title', '시작 칸·위치 보정', 'desc', '쓰다 남은 라벨지는 시작 칸을 고르고, 프린터 차이는 mm 단위로 맞춥니다.'),
      jsonb_build_object('icon', '📑', 'title', 'PDF 한 화면 정리', 'desc', '합치기·추출·삭제·순서 바꾸기·돌리기·나누기를 페이지 카드에서 한 번에 합니다.'),
      jsonb_build_object('icon', '🔒', 'title', '내 PC에서만 처리', 'desc', '주소 라벨·계약서 같은 파일이 서버로 가지 않고 API 키도 필요 없습니다.')
    ),
    'steps', jsonb_build_array(
      jsonb_build_object('title', '도구 고르기', 'desc', '라벨·QR·파일명·PDF·서명 중 할 일을 고릅니다.'),
      jsonb_build_object('title', '파일 넣기', 'desc', '엑셀·사진·PDF를 끌어 놓거나 표를 붙여 넣습니다.'),
      jsonb_build_object('title', '미리보기·조정', 'desc', '칸 위치·QR 대비·새 이름·페이지 순서를 확인합니다.'),
      jsonb_build_object('title', '인쇄·저장', 'desc', '실제 크기로 인쇄하거나 PNG·PDF·ZIP으로 저장합니다.')
    ),
    'audiences', jsonb_build_array(
      jsonb_build_object('icon', '📦', 'title', '직접 출고하는 소규모 셀러',
        'desc', '주문 엑셀을 넣어 상품명·옵션·바코드 라벨을 한 번에 인쇄하고 남은 라벨지는 시작 칸부터 이어 씁니다.',
        'points', jsonb_build_array('라벨 손글씨 작업 줄임', '라벨지 낭비 줄임')),
      jsonb_build_object('icon', '🍯', 'title', '식품을 소분·포장해 파는 판매자',
        'desc', '식품 한글표시사항 틀에 항목을 채워 같은 라벨을 여러 장 인쇄하고 QR로 스토어를 안내합니다.',
        'points', jsonb_build_array('표시사항 라벨 정리', '포장지 QR 바로 만들기')),
      jsonb_build_object('icon', '🗂', 'title', '입점·견적 서류를 자주 내는 사업자',
        'desc', '사업자등록증·통장 사본 사진을 PDF로 묶고 필요한 쪽만 골라 서명 그림을 넣어 보냅니다.',
        'points', jsonb_build_array('서류 PDF 한 번에 정리', '파일이 서버에 남지 않음'))
    )
  )
where not exists (select 1 from programs where slug = 'seller-label-docs');

-- 2) 기본 요금제 3단계 (1·2·3개월 1만/2만/3만원, components/admin/ProgramForm.tsx DEFAULT_PLANS)
insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'seller-label-docs'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);

-- 3) VIP(드림AI팀) 등급 표 체크 — 트리거 grade_program_access_sync가 VIP 회원에게 사용기간을 넣는다. 다른 등급은 주인님이 직접 부여.
insert into grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from member_grades g, programs p
where g.name = 'VIP(드림AI팀)' and p.slug = 'seller-label-docs'
on conflict (grade_id, program_id) do update set can_access = true;

-- 4) 시험 계정(buylifemall@naver.com, 일반 회원 권한)에 30일 사용 권한 — 운영 화면 검수용
insert into user_program_access (user_id, program_id, granted_by, expires_at, grant_source)
select u.id, p.id, a.id, now() + interval '30 days', 'manual'
from profiles u, programs p, profiles a
where u.email = 'buylifemall@naver.com' and p.slug = 'seller-label-docs' and a.email = 'buylifemall@gmail.com'
  and not exists (select 1 from user_program_access x where x.user_id = u.id and x.program_id = p.id);

-- 5) 확인
select p.slug, p.version, p.badges, p.app_url, c.slug as category,
  (select count(*) from pricing_plans pp where pp.program_id = p.id) as plans,
  (select count(*) from user_program_access x where x.program_id = p.id) as grants
from programs p join categories c on c.id = p.category_id
where p.slug = 'seller-label-docs';
