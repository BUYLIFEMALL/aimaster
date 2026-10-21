-- 2026-10-21 v1.17 대시보드 댓글 항목 글 앞부분·게시물 묶음 바로가기 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.17', updated_at = now() where slug = 'threads-comment-reply';
