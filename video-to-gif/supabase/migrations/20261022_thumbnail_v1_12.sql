-- v1.12: 대기 목록에 영상 첫 장면 썸네일(브라우저 안에서 생성, 서버 저장 없음) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.12', updated_at = now() where slug = 'video-to-gif';
select slug, version from public.programs where slug = 'video-to-gif';
