-- v1.53: AI 상세페이지 자동화 섹션 이미지 받기(posts/new?from=shop-detail&shopImage=) — DB 구조 변경 없음, 버전만.
update public.programs set version='v1.53', updated_at=now() where slug='auto-instagram-posting';
select slug, version from public.programs where slug='auto-instagram-posting';
