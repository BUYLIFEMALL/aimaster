-- 2026-10-21 v1.33: Suno 실패 문구 한국어 안내, 30일 정리 때 곡·변주 폴더 전체 삭제, 구간 수정본 커버 파일 복사. DB 구조 변경 없음.
update public.programs set version = 'v1.33', updated_at = now() where slug = 'music-automation';
