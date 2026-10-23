-- naver-blog-agent v1.05 버전 갱신
-- /guide 실전 매뉴얼 페이지 초보자 맞춤형 전면 개편

UPDATE programs
SET version = 'v1.05',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
