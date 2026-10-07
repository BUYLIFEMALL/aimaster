-- naver-blog-agent v1.06 버전 갱신
-- /accounts 카테고리 순서 위/아래 이동 및 카테고리 정보 수정(인라인 에디트) 기능 구현

UPDATE programs
SET version = 'v1.06',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
