-- v1.34 (2026-10-22): 결과 테스트 추세 기록 — 저장된 점검 지점이 있을 때 새로 생성할 때마다 평균 차이(최근 20회, 회원 본인 분석 행에만, 기존 RLS 그대로)
-- 운영 DB ref esgxyikcnnvmlhygjkth. ⚠ 2026-10-22 주인님 지시로 코드만 반영(배포 보류) — 이 SQL은 아직 실행하지 않음. 배포 전에 먼저 실행할 것.
alter table public.sda_analyses add column if not exists check_trend jsonb not null default '[]'::jsonb;
-- 배포 뒤: update public.programs set version = 'v1.34', updated_at = now() where slug = 'style-dna-analyzer';
