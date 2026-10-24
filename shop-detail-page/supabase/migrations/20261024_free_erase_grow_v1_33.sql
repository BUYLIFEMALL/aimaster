-- 2026-10-24 v1.33 — 무료 지우기 글자 상자 넓히기 0.5→0.9배(공용 browser-free-erase, 큰 굵은 제목 글자 조각 남던 문제). DB 구조 변경 없음(버전만)
update public.programs set version = 'v1.33', updated_at = now() where slug = 'shop-detail-page';
