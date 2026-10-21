-- 2026-10-21 v1.34: 음악 Remix 스튜디오에 보컬 추가·반주 추가·매시업 방식 추가(구조 변경은 0019_remix_modes.sql).
update public.programs set version = 'v1.34', updated_at = now() where slug = 'music-automation';
