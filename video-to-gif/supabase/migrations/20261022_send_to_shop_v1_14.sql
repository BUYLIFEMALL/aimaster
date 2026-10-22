-- v1.14: 완료된 GIF를 상세페이지 섹션으로 바로 보내기(브라우저 창끼리, 서버 저장 없음), 좁은 화면 완료 줄 배치 — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.14', updated_at = now() where slug = 'video-to-gif';
select slug, version from public.programs where slug = 'video-to-gif';
