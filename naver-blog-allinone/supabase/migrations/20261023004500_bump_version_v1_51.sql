-- v1.51 (2026-10-23): BC-05 보관함 30일 자동 삭제(Vercel Cron /api/cron/cleanup), 공용 사본 openai-request-params·year-policy 반영. 확장 코드 변경 없음(버전만).
update public.programs set version = 'v1.51', extension_version = 'v1.51', updated_at = now() where slug = 'naver-blog-allinone';
