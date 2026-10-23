-- v1.30 기획 목록에서 여러 기획 곡을 플레이리스트로 (2026-10-21)
update public.programs set version = 'v1.30', updated_at = now() where slug = 'music-automation';
