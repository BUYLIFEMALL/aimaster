-- v1.04 (2026-10-09): 예약 소스가 후보함이 비어 실패해도 last_run_at을 갱신해 설정한 주기를 따르게 함(5분마다 반복 실패 방지).
update public.programs set version = 'v1.04', updated_at = now() where slug = 'naver-cafe-poster';
