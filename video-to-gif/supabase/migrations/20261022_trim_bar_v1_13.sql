-- v1.13: 대기 목록에 끌어서 고르는 구간 막대·장면 미리보기(브라우저 안에서만 동작, 서버 저장 없음) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.13', updated_at = now() where slug = 'video-to-gif';
select slug, version from public.programs where slug = 'video-to-gif';
