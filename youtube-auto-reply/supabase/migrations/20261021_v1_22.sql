-- 2026-10-21 v1.22 대시보드 댓글 항목 영상 썸네일·영상 묶음 바로가기 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.22', updated_at = now() where slug = 'youtube-auto-reply';
