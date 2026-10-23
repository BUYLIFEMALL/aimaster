-- 2026-10-21 v1.04 건너뛰기 되돌리기 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.04', updated_at = now() where slug = 'comment-inbox';
