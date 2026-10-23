-- 2026-10-23 v1.28 모니터링 중지 즉시 화면 반영 · 다음 확인 예정 시각 · 실행 방식 바로가기. 표 변경 없음.
update public.programs set version = 'v1.28', updated_at = now() where slug = 'threads-comment-reply';
