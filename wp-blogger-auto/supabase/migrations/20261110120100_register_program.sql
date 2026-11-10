-- AI 워드프레스·구글블로그 자동화 프로그램 등록 + 기본 요금제 3단계 (2026-11-10, v1.01)
-- 대상: AIMaster 운영 DB esgxyikcnnvmlhygjkth. 비공개(is_active=false)로 등록 — 실물 시험 뒤 주인님 확인으로 공개.
-- 상세 소개(detail_sections)·썸네일은 공개 직전에 넣는다.
insert into programs (category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, app_url, badges, version)
select
  (select id from categories where slug = 'blog'),
  'AI 워드프레스·구글블로그 자동화',
  'wp-blogger-auto',
  '글감부터 원고·이미지까지 만들고 워드프레스·구글 블로그에 초안·발행·예약으로 바로 올립니다.',
  '<p>🌐 <strong>워드프레스와 구글 블로그에, 확장 프로그램 없이 공식 연결로 바로 올리는 블로그 자동화입니다.</strong></p>'
  || '<p>✍️ 주제·키워드·참고 주소를 넣으면 구글 검색에 맞춘 제목·요약 설명·주소 이름·소제목·태그까지 갖춘 원고를 만들고, 필요한 만큼 이미지를 함께 준비합니다.</p>'
  || '<p>🔗 워드프레스는 사이트 주소와 응용 비밀번호로, 구글 블로그는 본인 구글 연결 한 번으로 이어 두면 이후에는 다시 묻지 않습니다.</p>'
  || '<p>📅 원고마다 발행 전까지(초안), 바로 발행, 예약 발행 가운데 고르면 블로그가 직접 처리하므로 PC를 꺼 두어도 예약대로 올라갑니다. 올라간 글 주소와 결과가 보관함에 남습니다.</p>'
  || '<p>🔑 원고·이미지는 회원님 본인 AI 키로 만들고, 블로그도 본인 계정으로만 연결합니다. 결과가 확실하지 않으면 자동으로 다시 올리지 않으니 보관함에서 확인해 주세요.</p>',
  false,
  0,
  (select id from member_grades where name = '일반'),
  'https://wp-blogger-auto.buylife.xyz',
  array['coming']::text[],
  'v1.01'
where not exists (select 1 from programs where slug = 'wp-blogger-auto');

insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values ('1개월', 'monthly', 10000, 1), ('2개월', 'bimonthly', 20000, 2), ('3개월', 'quarterly', 30000, 3)) as v(name, billing_type, price, sort_order)
where p.slug = 'wp-blogger-auto'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);
