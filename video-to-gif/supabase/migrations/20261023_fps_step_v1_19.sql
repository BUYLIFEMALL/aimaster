-- v1.19: 8MiB 초과 영상용 사다리 끝 25·20fps 단계, 메뉴 문구(색상표 최적화), 미리보기 Esc 닫기 — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.19', updated_at = now() where slug = 'video-to-gif';
select slug, version from public.programs where slug = 'video-to-gif';
