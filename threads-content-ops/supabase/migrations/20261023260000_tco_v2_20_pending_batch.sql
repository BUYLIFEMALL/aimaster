-- v2.20 (2026-10-23): 모아 둔 수정 배포 — 보관함 초안 저장 직후 뺀 사진이 다시 보이던 화면 문제(editingRef, f92acc076),
-- 쿠팡 수동 등록 실패 때 임시 상품 사진을 서버 키로 삭제(6b44abdc8), 공용 사본(member-scheduler·openai-request-params, 동작 같음).
update public.programs set version = 'v2.20', updated_at = now() where slug = 'threads-content-ops';
