-- naver-blog-agent v1.08 버전 갱신
-- 글감 수집(떡상·트렌드) 신규 메뉴 신설 (웹 주소 스크랩, Perplexity 72시간 핫이슈, 유튜브 쇼츠 대박 분석)
-- 블로그 글 자동 생성기 내 수집 글감 선택 및 자동 연동 기능 구현

UPDATE programs
SET version = 'v1.08',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
