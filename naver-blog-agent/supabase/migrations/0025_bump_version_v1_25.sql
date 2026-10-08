-- naver-blog-agent v1.25 버전 업: 생성 콘텐츠(글감, 본문 원고, 이미지) 30일 보관 및 자동 삭제 Cron 구축과 관련 공지 배너/잔여일 배지 탑재
UPDATE public.programs
SET version = 'v1.25', updated_at = NOW()
WHERE slug = 'naver-blog-agent';
