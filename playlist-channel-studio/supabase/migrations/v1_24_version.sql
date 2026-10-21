-- v1.24 곡 끌어서 순서·올릴 채널 고르기 (2026-10-21)
update public.programs set version = 'v1.24', updated_at = now() where slug = 'playlist-channel-studio';
