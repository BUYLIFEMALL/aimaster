-- v1.26: 문구 고치기 덮는 색 선택지(바깥 색·안쪽 색·💧 찍기, 자동 색은 가장 많은 색) + 사용 안내 FAQ — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.26', updated_at = now() where slug = 'shop-detail-page';
select slug, version from public.programs where slug = 'shop-detail-page';
