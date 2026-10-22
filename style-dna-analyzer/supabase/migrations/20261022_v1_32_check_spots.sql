-- v1.32 (2026-10-22): 결과 테스트 「점검 지점」 보관 — 위치·그때의 색 차이·저장 시각(최대 8곳, 회원 본인 분석 행에만, 기존 RLS 그대로)
-- 운영 DB ref esgxyikcnnvmlhygjkth. 기존 행은 빈 목록.
alter table public.sda_analyses add column if not exists check_spots jsonb not null default '[]'::jsonb;
update public.programs set version = 'v1.32', updated_at = now() where slug = 'style-dna-analyzer';
