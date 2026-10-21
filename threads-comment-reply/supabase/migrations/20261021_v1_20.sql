-- 2026-10-21 v1.20 토큰 갱신 코드 분리(동작 같음) (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.20', updated_at = now() where slug = 'threads-comment-reply';
