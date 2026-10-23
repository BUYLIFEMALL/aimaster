-- 2026-10-20 v1.16: YouTube 연결 하나로 합치기 — 「다른 YouTube 프로그램 권한도 함께 받기」(루트 docs/PLAN_20261020_YOUTUBE_SCOPES_AND_SHOTS_FB_KEY.md)
-- 표 구조 변경 없음. 공용 표 granted_scopes에 Google이 실제로 내준 권한을 기록한다.
update public.programs set version = 'v1.16', updated_at = now() where slug = 'youtube-auto-reply';
