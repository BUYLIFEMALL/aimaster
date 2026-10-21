-- 2026-10-21 v1.21: 기존 곡 30일 자동 삭제(7일 유예, app/api/cron/cleanup + vercel.json). 스키마 변경 없음.
update programs set version = 'v1.21', updated_at = now() where slug = 'music-automation';
