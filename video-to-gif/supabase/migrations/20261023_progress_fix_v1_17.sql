-- v1.17: 진행률 — 색상표 단계의 「값 없음」 진행 이벤트 무시(v1.16 결함 수정) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.17', updated_at = now() where slug = 'video-to-gif';
select slug, version from public.programs where slug = 'video-to-gif';
