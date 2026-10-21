-- 2026-10-21 v1.30 결과 배경 전환·단계 칩 이동·안 쓰는 CSS 정리 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.30', updated_at = now() where slug = 'portrait-photo';
