-- v1.11: 구간 자르기·완료된 GIF 전체 ZIP·변환 엔진 불러오기 실패 복구 — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.11', updated_at = now() where slug = 'video-to-gif';
select slug, version from public.programs where slug = 'video-to-gif';
