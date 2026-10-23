-- naver-blog-agent v1.04 버전 갱신
-- SettingsPage SSR 서버 컴포넌트 전환 및 초기 렌더링 시 계정 연동 AI 키 즉시 공급

UPDATE programs
SET version = 'v1.04',
    updated_at = NOW()
WHERE slug = 'naver-blog-agent';
