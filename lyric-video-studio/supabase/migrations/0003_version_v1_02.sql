-- v1.02 (2026-10-21): 추가개선 1 — 줄 끝 시각·파일로 바로 저장(공용 엔진 encodeMp4ToFile)
update public.programs set version = 'v1.02', updated_at = now() where slug = 'lyric-video-studio';
