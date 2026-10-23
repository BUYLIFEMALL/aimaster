-- 2026-10-23 v2.16 상품 연동(쿠팡·알리·토스) 코드를 공용 기준 코드 affiliate-clients 사본으로. 표 변경 없음.
update public.programs set version = 'v2.16', updated_at = now() where slug = 'threads-content-ops';
