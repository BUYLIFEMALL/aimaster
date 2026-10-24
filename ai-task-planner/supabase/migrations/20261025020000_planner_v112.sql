-- 2026-10-25 ai-task-planner v1.12: U8-B 업무 워크스페이스에서 보낸 할 일 받기(「📥 받은 할 일」). 스키마 변경 없음(공용 표 work_inbox.target_slug = ai-task-planner, 열은 ai-work-workspace/supabase/migrations/20261025000100).
update programs set version = 'v1.12', updated_at = now() where slug = 'ai-task-planner';
