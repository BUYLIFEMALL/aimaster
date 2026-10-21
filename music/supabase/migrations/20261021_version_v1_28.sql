-- 2026-10-21 v1.28: 정밀 기획 기획(제외 스타일 "")에서 빠른 생성 패널 재생성 허용. 페르소나 v1.27은 0016_music_personas.sql에 포함.
update public.programs set version = 'v1.28', updated_at = now() where slug = 'music-automation';
