-- v1.30: 휴대폰·연계 묶음(하단 버튼 한 줄·편집 창 맨 위·저장 조건 안내·GIF 자동화 링크) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.30', updated_at = now() where slug = 'shop-detail-page';
select slug, version from public.programs where slug = 'shop-detail-page';
