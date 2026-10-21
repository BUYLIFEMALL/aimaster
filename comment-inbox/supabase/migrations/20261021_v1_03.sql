-- 2026-10-21 v1.03 단축키 도움말·밀어서 건너뛰기 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.03', updated_at = now() where slug = 'comment-inbox';
