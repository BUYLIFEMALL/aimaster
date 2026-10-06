-- naver-blog-agent v1.03 버전 갱신
-- 통합 계정 연동 AI 키 목록 시각화 및 Perplexity 검색 키 지원, DELETE 엔드포인트 탑재

UPDATE programs
SET version = 'v1.03',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
