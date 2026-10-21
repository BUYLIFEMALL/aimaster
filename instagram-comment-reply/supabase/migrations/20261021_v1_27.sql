-- 2026-10-21 v1.27 대시보드 DM 카드 24시간 남은 시간·급한 순·대화 바로가기 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.27', updated_at = now() where slug = 'instagram-comment-reply';
