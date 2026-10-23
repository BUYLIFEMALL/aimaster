-- 2026-10-21 v1.21 이중 게시 방지(replied_at 선점)·통합 받은편지함 링크 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.21', updated_at = now() where slug = 'threads-comment-reply';
