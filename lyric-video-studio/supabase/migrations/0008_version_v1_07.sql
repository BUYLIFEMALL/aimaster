-- v1.07 배경 그림을 유튜브 썸네일로 지정 (2026-10-21)
update public.programs set version = 'v1.07', updated_at = now() where slug = 'lyric-video-studio';
