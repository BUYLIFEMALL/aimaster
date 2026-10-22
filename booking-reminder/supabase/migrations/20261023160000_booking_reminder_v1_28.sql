-- 2026-10-23 v1.28 예약 엑셀 일괄 등록 + 한국 시간 수정 — 표 변경 없음, 버전만.
update public.programs set version = 'v1.28', updated_at = now() where slug = 'booking-reminder';
