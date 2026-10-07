-- naver-blog-agent v1.10 버전 갱신
-- 좌측 메뉴 구조 개편: 작업 흐름 1단계 [글감 수집 (떡상·트렌드)]을 사이드바 최상단으로 재배치

UPDATE programs
SET version = 'v1.10',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
