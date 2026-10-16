-- v1.05 (2026-10-16): MP4 내보내기 무음 버그 수정(소리 데이터를 실제로 인코딩)
update public.programs set version='v1.05', updated_at=now() where slug='yt-playlist-studio';
