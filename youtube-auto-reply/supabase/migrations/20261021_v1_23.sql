-- 2026-10-21 v1.23 공용 기준 코드 pending-review-list·hash-highlight 사본 적용 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.23', updated_at = now() where slug = 'youtube-auto-reply';
