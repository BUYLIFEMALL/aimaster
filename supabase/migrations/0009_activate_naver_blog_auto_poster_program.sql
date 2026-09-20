-- 네이버 블로그 자동화(naver-blog-auto-poster) 공개 판매 시작.
-- 개발/테스트가 끝나서 카탈로그에 노출하고(is_active=true), "coming" 배지를 "new"로 교체한다.
update programs
set is_active = true,
    badges = ARRAY['new']
where slug = 'naver-blog-auto-poster';
