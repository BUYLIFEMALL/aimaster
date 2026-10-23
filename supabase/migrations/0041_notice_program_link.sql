-- 2026-10-20 공지에 관련 프로그램 연결 + 「내 작업대」 새 공지 알림 (docs/PLAN_20261020_NOTICE_PROGRAM_LINK.md)
-- program_ids가 비어 있으면 사이트 전체 공지(기존 공지는 모두 여기에 해당 — 동작 변화 없음)
alter table public.notices add column if not exists program_ids uuid[] not null default '{}';
create index if not exists notices_program_ids_gin on public.notices using gin (program_ids);

-- 즐겨찾기한 프로그램의 공지를 마지막으로 본 시각(없으면 고정한 시각 created_at 기준)
alter table public.program_favorites add column if not exists seen_notice_at timestamptz;
