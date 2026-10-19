-- 2026-10-20 v1.22: 공용 부품(lib/memberIntegrations.ts 사본) 정정 — 저장 시 이전 권한과 합치지 않고 이번 연결에서 요청한 권한만 기록.
-- 표 구조 변경 없음.
update public.programs set version = 'v1.22', updated_at = now() where slug = 'auto-threads-posting';
