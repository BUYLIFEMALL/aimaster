-- 네이버 블로그 자동화를 "PC 앱(naver-blog-auto-poster)"과 "크롬 확장
-- (naver-blog-auto-poster-web)" 완전히 별도의 유료 프로그램 2개로 분리한다.
-- 2026-09-21 사용자 명시적 결정: 두 버전은 자동화 로직 자체가 서로 달라(Playwright vs
-- chrome.scripting) 코드/문서를 이미 별도 폴더(naver-blog-auto-poster_app/_web)로
-- 분리했고, 앞으로도 각자 독립적으로 유지보수·업데이트한다 — 이용권한/요금제도 더 이상
-- 공유하지 않는다. 분리 시점에 이 프로그램의 활성 구독/토큰은 0건이라 기존 회원
-- 이관 이슈는 없다.

-- 1) 기존 프로그램을 "PC 앱" 전용으로 명확히 재명명
update programs
set name = '네이버 블로그 자동화 - PC 앱',
    short_desc = '내 네이버 계정으로 AI가 쓴 블로그 글을 자동으로 채워 넣는 PC 데스크톱 앱',
    description = 'Windows PC에 설치하는 데스크톱 앱입니다. 내 네이버 계정에 로그인한 뒤, AI가 주제에 맞춰 작성한 제목/본문/이미지를 네이버 블로그 글쓰기 화면에 자동으로 채워 넣습니다. 발행 버튼은 항상 본인이 최종 확인 후 직접 누릅니다. 브라우저에서 설치 없이 바로 쓰고 싶다면 "네이버 블로그 자동화 - 크롬 확장"을 별도로 이용하세요.'
where slug = 'naver-blog-auto-poster';

-- 2) 크롬 확장을 완전히 별도 프로그램으로 신규 등록 (표준 3단계 요금제 포함)
with new_program as (
  insert into programs (category_id, required_grade_id, name, slug, short_desc, description, is_active, badges, sort_order)
  values (
    '36814b08-177b-4674-ae89-b2b95aa657da', -- 네이버 카테고리
    '861b7a37-d056-4404-80f5-85edb2e2ebff', -- 일반(basic) 등급
    '네이버 블로그 자동화 - 크롬 확장',
    'naver-blog-auto-poster-web',
    '설치 없이 크롬 브라우저 사이드패널에서 바로 쓰는 네이버 블로그 자동 포스팅 확장',
    '별도 프로그램 설치 없이 크롬 브라우저 사이드패널에서 바로 쓰는 자동화 도구입니다. 내 네이버 계정에 로그인된 크롬에서, AI가 주제에 맞춰 작성한 제목/본문/이미지를 네이버 블로그 글쓰기 화면에 자동으로 채워 넣습니다. 발행 버튼은 항상 본인이 최종 확인 후 직접 누릅니다. PC에 설치하는 프로그램을 원하면 "네이버 블로그 자동화 - PC 앱"을 별도로 이용하세요.',
    true,
    ARRAY['new'],
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
