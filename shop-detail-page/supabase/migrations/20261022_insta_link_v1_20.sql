-- v1.20: 완성된 섹션에 「📸 인스타 홍보글」 버튼(INSTA 포스팅 자동화 새 글로 이미지 1장·캡션 초안) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.20', updated_at = now() where slug = 'shop-detail-page';
select slug, version from public.programs where slug = 'shop-detail-page';
