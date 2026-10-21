-- 2026-10-22 v1.07 7일 그래프 플랫폼별 쌓기·그날 목록 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.07', updated_at = now() where slug = 'comment-inbox';
