-- 2026-10-21 v1.25 발송 이력 선택 탭 다크 색 수정 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.25', updated_at = now() where slug = 'instagram-comment-reply';
