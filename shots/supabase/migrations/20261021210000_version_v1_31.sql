-- v1.31 (2026-10-21): 사용 기록 usage_logs(script_created·video_browser·video_j2v·youtube_uploaded·instagram_posted) — 보류 F 재판단용. 구조 변경 없음 — 버전만
update public.programs set version='v1.31', updated_at=now() where slug='auto-shorts-posting';
