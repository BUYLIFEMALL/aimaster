-- v1.22 (2026-10-20): 정기 자동 실행 직전 프로그램 이용 권한 확인(사용기간 끝난 회원은 실행 안 함). DB 구조 변경 없음.
update public.programs set version = 'v1.22', updated_at = now() where slug = 'naver-cafe-poster';
