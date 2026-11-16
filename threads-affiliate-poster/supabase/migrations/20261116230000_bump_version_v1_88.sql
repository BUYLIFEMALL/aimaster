-- 2026-11-16 v1.88: threads-auto(MIT) 이식 1단계 — 쿠팡 여러 경로 검색·이미 등록 제외·일괄 등록(source_key 칸은 20261116120000에서 적용),
-- 공통: 저장공간 위젯 한 줄, 로그아웃 이 브라우저만, 서버 로그인 기기 정보 전달.
update public.programs set version = 'v1.88', updated_at = now() where slug = 'threads-affiliate-poster';
