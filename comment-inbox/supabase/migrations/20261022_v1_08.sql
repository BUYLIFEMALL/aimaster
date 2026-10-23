-- 2026-10-22 v1.08 그날 목록에 원래 댓글 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.08', updated_at = now() where slug = 'comment-inbox';
