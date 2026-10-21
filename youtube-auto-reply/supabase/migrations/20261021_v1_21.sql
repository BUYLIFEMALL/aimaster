-- 2026-10-21 v1.21 대시보드 검토 대기 목록 형식 통일 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.21', updated_at = now() where slug = 'youtube-auto-reply';
