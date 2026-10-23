-- 프로그램 출시 메타데이터만 갱신합니다. 스키마·회원 키·회원 기록은 변경하지 않습니다.
update public.programs set version = 'v1.04' where slug = 'ai-task-planner';
