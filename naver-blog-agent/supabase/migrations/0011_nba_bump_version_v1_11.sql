-- naver-blog-agent v1.11 버전 갱신
-- 떡상 글감 수집소(/collector) 카테고리 관리 기능 고도화:
-- 1. 카테고리 추가, 인라인 수정, 삭제, 위/아래 순서 정렬(▲/▼) 모달 시스템
-- 2. 3대 글감 수집 탭(URL, Perplexity, 쇼츠)별 수집 대상 카테고리 선택 기능
-- 3. 카테고리별 글감 필터링 칩 바
-- 4. 특정 글감 및 선택 글감의 카테고리 일괄/개별 이동 기능

UPDATE programs
SET version = 'v1.11',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
