-- v1.28: GIF 자동화에서 보낸 GIF를 섹션에 넣는 「GIF 받기」 화면, 섹션 GIF 허용·ZIP 원본 GIF, 배지 안내(S-22-18) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.28', updated_at = now() where slug = 'shop-detail-page';
select slug, version from public.programs where slug = 'shop-detail-page';
