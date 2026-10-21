-- 2026-10-22 v1.39: D-68-02 Suno 임시 주소로 남은 결과에 「임시 보관」 표시와 「내 보관함에 다시 저장」.
update public.programs set version = 'v1.39', updated_at = now() where slug = 'music-automation';
