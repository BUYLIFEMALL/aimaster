-- 2026-10-21 v1.06 최근 7일 응대 그래프 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.06', updated_at = now() where slug = 'comment-inbox';
