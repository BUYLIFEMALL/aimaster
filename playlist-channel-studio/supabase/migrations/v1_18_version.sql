-- v1.18 MP4 스펙트럼·저음 효과를 실제 소리로 (IMP-PLS-006, 2026-10-21)
update public.programs set version = 'v1.18', updated_at = now() where slug = 'playlist-channel-studio';
