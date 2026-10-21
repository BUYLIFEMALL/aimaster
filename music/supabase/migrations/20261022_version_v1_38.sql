-- 2026-10-22 v1.38: 매시업 후보에 만든 날짜·시각(KST) 표시.
update public.programs set version = 'v1.38', updated_at = now() where slug = 'music-automation';
