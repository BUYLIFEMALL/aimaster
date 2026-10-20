-- v1.22 (2026-10-21): 사용 기록 usage_logs(script_created·mp4_made·youtube_uploaded, 브라우저 동작은 /api/usage) — 보류 F 재판단용. 구조 변경 없음 — 버전만
update public.programs set version='v1.22', updated_at=now() where slug='shorts-onestop-studio';
