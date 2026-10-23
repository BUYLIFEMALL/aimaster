-- v1.18: GIF 매뉴얼·안내 묶음(G-23-01·02·04·05) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.18', updated_at = now() where slug = 'video-to-gif';
select slug, version from public.programs where slug = 'video-to-gif';
