-- v1.29: 회원 점검 급한 것(남은 섹션만 생성·실패 시 완성 표시 안 함·상품 목록 위로·매뉴얼 문구·새 상품 비용 안내) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.29', updated_at = now() where slug = 'shop-detail-page';
select slug, version from public.programs where slug = 'shop-detail-page';
