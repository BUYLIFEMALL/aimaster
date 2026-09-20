-- 네이버 블로그 자동화(naver-blog-auto-poster) 프로그램을 카탈로그에 등록한다.
-- 아직 개발/테스트 중이라 is_active=false(공개 판매 전)로 등록하고, 요금제만
-- 표준 3단계(1/2/3개월)로 미리 만들어둔다 — 나중에 is_active를 true로 바꾸는 것만으로
-- 바로 판매를 시작할 수 있게 하기 위함.
with new_program as (
  insert into programs (category_id, required_grade_id, name, slug, short_desc, description, is_active, badges, sort_order)
  values (
    '36814b08-177b-4674-ae89-b2b95aa657da', -- 네이버 카테고리
    '861b7a37-d056-4404-80f5-85edb2e2ebff', -- 일반(basic) 등급
    '네이버 블로그 자동화',
    'naver-blog-auto-poster',
    '데스크톱 앱으로 네이버 블로그 글쓰기를 자동화합니다 (개발 중)',
    '내 네이버 계정으로 로그인한 뒤, AI가 만든 글을 자동으로 채워 넣고 사람이 최종 확인 후 발행하는 데스크톱 자동화 도구입니다. 현재 개발/테스트 중이라 아직 공개 판매 전입니다(is_active=false).',
    false,
    ARRAY['coming'],
    (select coalesce(max(sort_order), 0) + 1 from programs)
  )
  returning id
)
insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select id, '1개월', 'monthly', 10000, 10000, true, 0 from new_program
union all
select id, '2개월', 'bimonthly', 20000, 20000, true, 1 from new_program
union all
select id, '3개월', 'quarterly', 30000, 30000, true, 2 from new_program;
