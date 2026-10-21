-- v1.23 배경 그림 → 유튜브 썸네일 (2026-10-21)
update public.programs set version = 'v1.23', updated_at = now() where slug = 'playlist-channel-studio';
