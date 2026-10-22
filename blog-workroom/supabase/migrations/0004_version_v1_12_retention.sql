-- v1.12 (2026-10-22): BC-05 회원 생성물 30일 자동 삭제(설정·내 블로그 제외) — Vercel Cron /api/cron/cleanup, 이미지 작업 삭제 시 파일도 삭제. DB 표 구조 변경 없음(버전만).
update public.programs set version = 'v1.12', updated_at = now() where slug = 'blog-workroom';
