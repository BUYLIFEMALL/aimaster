-- 2026-10-17 v1.10: 이력 검색·페이지 나눔·조회 오류 안내·30일 보관 정리(cron). 스키마 변경 없음.
update programs set version = 'v1.10', updated_at = now() where slug = 'youtube-auto-reply';
