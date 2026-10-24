-- 2026-10-24 v1.31 — 문구 고치기 편집기에 무료 지우기(공용 browser-free-erase 사본, 회원 브라우저 계산) · 30일 정리 기록 함께 배포. DB 구조 변경 없음(버전만)
update public.programs set version = 'v1.31', updated_at = now() where slug = 'shop-detail-page';
