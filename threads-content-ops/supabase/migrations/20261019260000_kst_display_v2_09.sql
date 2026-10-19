-- v2.09 (2026-10-19): 날짜·예약 시각을 한국 시간대로 표시(첫 화면이 서버에서 UTC로 그려지던 문제). DB 구조 변경 없음.
update public.programs set version = 'v2.09', updated_at = now() where slug = 'threads-content-ops';
