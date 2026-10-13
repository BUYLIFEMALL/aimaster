-- 운영 화면 검사에서 발견한 focus 재조회 중 타이머 조작 지연 수정.
update public.programs set version='v1.02', updated_at=now() where slug='ai-task-planner';
