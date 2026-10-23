-- v1.21: 긴 PNG를 저장 후 서명 주소로 내려받기 + 섹션별 860px ZIP 받기 — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.21', updated_at = now() where slug = 'shop-detail-page';
select slug, version from public.programs where slug = 'shop-detail-page';
