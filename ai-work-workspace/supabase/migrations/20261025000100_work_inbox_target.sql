-- U8-B (2026-10-25, 주인님 승인): 공용 받은편지함에 「받는 곳」 열 추가 — 워크스페이스 → 할 일 플래너 방향을 같은 표로.
-- 플랜: ai-work-workspace/docs/PLAN_20261025_U8B_TO_PLANNER.md · 기존 줄·코드는 기본값으로 그대로 동작. RLS·30일 삭제는 변경 없음.
alter table public.work_inbox
  add column if not exists target_slug text not null default 'ai-work-workspace'
  check (target_slug ~ '^[a-z0-9-]{2,60}$');
create index if not exists work_inbox_user_target_created
  on public.work_inbox (user_id, target_slug, created_at desc);
comment on column public.work_inbox.target_slug is '받는 프로그램 programs.slug (기본 ai-work-workspace)';
