-- 2026-10-23 v1.30 모니터링 시작 시각을 한국 시간으로 읽기(9시간 밀림 수정). 표 변경 없음.
update public.programs set version = 'v1.30', updated_at = now() where slug = 'youtube-auto-reply';
