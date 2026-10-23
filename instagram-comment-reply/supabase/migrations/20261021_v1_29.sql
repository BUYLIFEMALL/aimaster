-- 2026-10-21 v1.29 공용 기준 코드 pending-review-list·hash-highlight 도입 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.29', updated_at = now() where slug = 'instagram-comment-reply';
