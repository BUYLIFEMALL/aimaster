-- v1.20 (2026-10-19): 날짜·예약 시각을 한국 시간대로 표시(서버 화면이 UTC로 그리던 문제). DB 구조 변경 없음.
update public.programs set version = 'v1.20', updated_at = now() where slug = 'auto-threads-posting';
