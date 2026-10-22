-- v1.25: 생성 이미지 위 문구 고치기(브라우저 편집기, 새 버전으로 저장) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.25', updated_at = now() where slug = 'shop-detail-page';
select slug, version from public.programs where slug = 'shop-detail-page';
