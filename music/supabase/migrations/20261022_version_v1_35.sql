-- 2026-10-22 v1.35: 리믹스 원곡 MR 종류 표시, 매시업 후보에서 같은 곡 제외.
update public.programs set version = 'v1.35', updated_at = now() where slug = 'music-automation';
