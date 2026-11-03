-- v1.49 30일 정리 수정(멈춘 생성 중 곡·리믹스 원곡, 관리자·시험 계정 제외) (2026-11-03)
update public.programs set version = 'v1.49', updated_at = now() where slug = 'music-automation';
