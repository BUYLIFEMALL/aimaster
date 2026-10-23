-- 2026-10-21 v1.11: API 이용 권한 확인(F-013)·4.5MB 넘는 오디오 업로드(F-014). 스키마 변경 없음.
update programs set version = 'v1.11', updated_at = now() where slug = 'ai-audio-analyzer';
