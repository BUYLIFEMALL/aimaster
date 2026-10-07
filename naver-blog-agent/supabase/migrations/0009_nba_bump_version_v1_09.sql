-- naver-blog-agent v1.09 버전 갱신
-- 1. 원하는 글자수 생성 설정 슬라이더 바 (1 ~ 4,000자 범위, 5단계 AI 파이프라인 연동)
-- 2. 글의 화자 (페르소나) 정의 명확화 및 추천 글자수 가이드 제공
-- 3. 네이버 블로그 에이전트 전용 운영 대시보드(/dashboard) 신설 및 사이드바 최상단 배치

UPDATE programs
SET version = 'v1.09',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
