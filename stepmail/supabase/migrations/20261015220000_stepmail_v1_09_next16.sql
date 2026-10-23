-- 2026-10-15 v1.09: Next.js 16 이전(next 16.4.1, middleware.ts → proxy.ts, eslint 9) — 운영 의존성 취약점 2 → 0. 운영 DB 적용 완료.
update public.programs set version = 'v1.09', updated_at = now() where slug = 'stepmail';
