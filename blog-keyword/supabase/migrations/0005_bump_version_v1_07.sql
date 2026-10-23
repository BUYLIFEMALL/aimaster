-- v1.07 (2026-10-22): BC-05 분석 기록 30일 자동 삭제(즐겨찾기 제외) — 0004 참고.
update public.programs set version = 'v1.07', updated_at = now() where slug = 'blog-keyword';
