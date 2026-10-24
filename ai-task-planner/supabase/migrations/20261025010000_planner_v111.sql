-- 2026-10-25 ai-task-planner v1.11: U8 업무 워크스페이스 「받은 업무」로 보내기(할 일 하나·오늘 성과). 스키마 변경 없음(U7 공용 표 public.work_inbox 사용).
update programs set version = 'v1.11', updated_at = now() where slug = 'ai-task-planner';
