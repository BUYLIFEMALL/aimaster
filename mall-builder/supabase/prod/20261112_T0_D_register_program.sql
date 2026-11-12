-- T0 D(2026-11-12) 운영 AIMaster DB(esgxyikcnnvmlhygjkth) — 메인 사이트 programs에 「AI 쇼핑몰 빌더」 등록 + 기본 요금제 3단계
-- 주인님 결정(2026-11-11): 샘플몰 구경·주문 시험은 로그인 회원(→ FREE 배지), 몰 만들기·공급사 초대는 관리자만(앱이 판정). 배지는 주인님이 관리 화면에서 바꿀 수 있음.
-- 상세 소개 형식: docs/PROGRAM_DESCRIPTION_STANDARD.md. 같은 slug가 있으면 넣지 않는다(두 번 실행해도 안전).
with cat as (select id from public.categories where slug = 'ecommerce'),
     grade as (select id from public.member_grades where name = '일반' limit 1),
     ins as (
  insert into public.programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version, detail_sections)
  select (select id from cat), 'AI 쇼핑몰 빌더', 'mall-builder',
    '공급사가 입점하고 소비자·사업자 등급별 가격으로 파는 B2B 입점몰을 몰 하나로 운영하는 쇼핑몰 빌더',
    '<p>🏬 <strong>공급사가 입점해 상품을 올리고, 소비자·사업자에게 등급별 가격으로 파는 B2B 입점몰 빌더입니다.</strong></p>'
    || '<p>🤝 초대받은 공급사가 상품을 올리면 운영자가 공급사마다 「바로 판매」나 「승인 후 판매」를 정합니다. 주문은 공급사별로 나뉘어 발송되고, 구매 확정분은 정산 장부와 월별 정산서로 정리됩니다.</p>'
    || '<p>💳 가입 후 승인을 받는 폐쇄몰로 운영할 수 있고, 등급 할인율 → 카테고리별 할인율 → 상품 예외 순서로 구입가가 정해지며 공급가+최소 마진 아래로는 내려가지 않습니다.</p>'
    || '<p>📦 사업자 손님용 외상·견적·거래명세서·빠른 재주문·정기 주문을 갖췄고, 첫 화면은 블록을 쌓아 꾸밉니다.</p>'
    || '<p>🔑 지금은 로그인한 회원 누구나 B2B 입점몰 샘플에서 가입·주문을 해 볼 수 있습니다(실제 결제 없음). 몰 만들기와 공급사 초대는 관리자만 하며, AI 보조 기능은 몰 대표 본인 AI 키로 동작합니다.</p>',
    true, 6, (select id from grade), 'https://mall-builder.buylife.xyz', array['free', 'new'], 'v1.01',
    jsonb_build_object(
      'features', jsonb_build_array(
        jsonb_build_object('icon', '🤝', 'title', '공급사 입점·정산', 'desc', '초대한 공급사가 상품을 올리고 주문을 직접 발송하며, 구매 확정분은 정산 장부와 월별 정산서로 정리됩니다.'),
        jsonb_build_object('icon', '🏷', 'title', '등급별 실제 구입가', 'desc', '등급 기본 할인율·카테고리별 할인율·상품 예외 순서로 가격이 정해지고, 공급가+최소 마진 아래로는 내려가지 않습니다.'),
        jsonb_build_object('icon', '🔐', 'title', '승인제 폐쇄몰', 'desc', '가입 후 운영자 승인을 받아야 상품이 보이고, 승인할 때 손님 등급을 정합니다.'),
        jsonb_build_object('icon', '📄', 'title', '사업자 거래 기능', 'desc', '외상 한도·견적·거래명세서·빠른 재주문·정기 주문으로 도매 거래를 그대로 옮깁니다.')),
      'steps', jsonb_build_array(
        jsonb_build_object('title', '몰 설정', 'desc', '운영자가 쇼핑몰 정보·배송비·등급과 할인율을 정합니다.'),
        jsonb_build_object('title', '공급사 초대', 'desc', '공급사를 초대하고 바로 판매 또는 승인 후 판매를 정합니다.'),
        jsonb_build_object('title', '상품 올리기', 'desc', '공급사가 상품을 올리고 운영자가 판매가를 확정합니다.'),
        jsonb_build_object('title', '주문·정산', 'desc', '주문은 공급사별로 발송되고 구매 확정분이 정산됩니다.')),
      'audiences', jsonb_build_array(
        jsonb_build_object('icon', '🏭', 'title', '공급사를 모아 도매몰을 여는 사업자', 'desc', '여러 공급사 상품을 한 몰에 모으고, 공급사별 발송·정산을 장부로 관리합니다.', 'points', jsonb_build_array('공급사별 주문 분배', '월별 정산서')),
        jsonb_build_object('icon', '🧾', 'title', '소매상·사업자 손님이 많은 도매 판매자', 'desc', '사업자 등급마다 다른 구입가와 외상·견적·거래명세서로 전화·문자 주문을 몰 주문으로 바꿉니다.', 'points', jsonb_build_array('등급별 가격', '외상·거래명세서')),
        jsonb_build_object('icon', '🔒', 'title', '회원제로만 파는 폐쇄몰 운영자', 'desc', '승인한 손님에게만 상품과 가격을 보여 주고, 승인하면서 등급을 정합니다.', 'points', jsonb_build_array('가입 승인제', '비회원에게 가격 숨김'))))
  where not exists (select 1 from public.programs where slug = 'mall-builder')
  returning id
)
insert into public.pricing_plans (program_id, name, billing_type, price, is_active, sort_order)
select ins.id, v.name, v.billing_type, v.price, true, v.sort_order
from ins, (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order);
