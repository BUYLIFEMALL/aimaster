-- 2026-10-24 v1.32 — 무료 지우기 큰 글자 품질(공용 browser-free-erase: 작업 영역 여유 0.3배·384px 조각). DB 구조 변경 없음(버전만)
update public.programs set version = 'v1.32', updated_at = now() where slug = 'shop-detail-page';
