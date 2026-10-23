-- v1.26 (2026-10-19): 날짜·예약 시각 표시를 한국 시간대로 고정(서버가 UTC로 표시해 예약 시각이 9시간 이르게 보이던 문제). DB 구조 변경 없음.
update public.programs set version = 'v1.26', updated_at = now() where slug = 'auto-instagram-posting';
