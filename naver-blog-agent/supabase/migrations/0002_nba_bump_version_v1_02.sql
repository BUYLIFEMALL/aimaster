-- naver-blog-agent v1.02 버전 갱신
-- 크롬 확장 원클릭 ZIP 다운로드 빌드 스크립트(prebuild) 및 대시보드 다운로드 연동

UPDATE programs
SET version = 'v1.02',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
