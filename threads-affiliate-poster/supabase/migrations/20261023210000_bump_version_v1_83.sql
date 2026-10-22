-- 2026-10-23 v1.83 상품 연동(쿠팡·알리·토스) 코드를 공용 기준 코드 affiliate-clients로(이 앱이 기준). 표 변경 없음.
update public.programs set version = 'v1.83', updated_at = now() where slug = 'threads-affiliate-poster';
