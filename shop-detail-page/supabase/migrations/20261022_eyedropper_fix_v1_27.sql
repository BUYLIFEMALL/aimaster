-- v1.27: 문구 고치기 💧 찍기 색이 손을 뗄 때 바깥 색으로 다시 덮이던 문제 수정 — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.27', updated_at = now() where slug = 'shop-detail-page';
select slug, version from public.programs where slug = 'shop-detail-page';
