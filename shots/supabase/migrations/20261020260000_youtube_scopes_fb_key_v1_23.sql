-- 2026-10-20 v1.23: YouTube 연결 하나로 합치기(권한 함께 받기) + Facebook 앱 키 이름 맞추기(루트 docs/PLAN_20261020_YOUTUBE_SCOPES_AND_SHOTS_FB_KEY.md)
-- 표 구조 변경 없음. facebook_app_id/facebook_app_secret 제공자는 루트 0037에서 이미 허용됨.
update public.programs set version = 'v1.23', updated_at = now() where slug = 'auto-shorts-posting';
