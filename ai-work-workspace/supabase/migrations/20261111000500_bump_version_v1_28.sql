-- 2026-11-11 v1.28: U13 협업(초대한 회원끼리 워크스페이스·페이지 공유, 5초 확인, 동시 편집 잠금) + 캘린더 시간 유지·에이전트 기본 이름
update public.programs set version = 'v1.28', updated_at = now() where slug = 'ai-work-workspace';
