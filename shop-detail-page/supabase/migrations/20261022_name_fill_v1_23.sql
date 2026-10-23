-- v1.23: 사진 없이 상품명으로 먼저 채우기(AI 12단 장점 이관) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.23', updated_at = now() where slug = 'shop-detail-page';
select slug, version from public.programs where slug = 'shop-detail-page';
