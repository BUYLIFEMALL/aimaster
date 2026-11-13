-- v1.41 (2026-11-13, 음악 담당): 30일 자동 정리(정리 라우트 /api/cron/cleanup + Vercel cron). 표 변경 없음.
update public.programs set version = 'v1.41', updated_at = now() where slug = 'playlist-channel-studio';
