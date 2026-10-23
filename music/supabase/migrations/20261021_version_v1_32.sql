-- 2026-10-21 v1.32: Suno 커버 「이 커버로 바꾸기」가 변주 표 RLS(수정 정책 없음)로 0건 수정되던 결함 수정(본인 확인 후 관리자 클라이언트). DB 구조 변경 없음.
update public.programs set version = 'v1.32', updated_at = now() where slug = 'music-automation';
