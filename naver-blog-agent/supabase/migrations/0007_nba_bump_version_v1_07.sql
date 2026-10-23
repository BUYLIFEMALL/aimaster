-- naver-blog-agent v1.07 버전 갱신
-- 6대 상황별 페르소나 원클릭 생성 엔진 탑재 및 결과물 섹션 하단 수직 이동 레이아웃 구현

UPDATE programs
SET version = 'v1.07',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
