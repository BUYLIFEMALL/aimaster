-- 2026-10-21 v1.02 단축키·자동 펼침·이중 게시 방지 반영 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.02', updated_at = now() where slug = 'comment-inbox';
