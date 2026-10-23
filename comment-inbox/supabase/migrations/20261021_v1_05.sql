-- 2026-10-21 v1.05 오늘 답한 건수 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.05', updated_at = now() where slug = 'comment-inbox';
