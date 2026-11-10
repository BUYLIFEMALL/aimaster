-- 2026-11-11 구글 캘린더 연동 ② 구글 계정 연결 — 공용 연동 카탈로그에 google_calendar 한 줄 추가(추가만, 기존 데이터 변경 없음).
-- 회원 본인 구글 OAuth 앱(user_api_keys google_client_id/secret — 유튜브·구글 블로그와 같은 칸)으로 연결, 토큰은 member_platform_accounts.
-- 플랜: ai-work-workspace/docs/PLAN_20261111_GOOGLE_CALENDAR.md · 대상 DB: AIMaster 운영(ref esgxyikcnnvmlhygjkth)
insert into public.integration_catalog (key, kind, label, description, key_names, scope_sets, guide_id, connect_program_url, sort_order, is_active)
values ('google_calendar', 'oauth_account', '구글 캘린더', '본인 Google 앱으로 연결한 구글 캘린더(일정 보내기·가져오기).',
        array['google_client_id', 'google_client_secret'], '{"events": ["https://www.googleapis.com/auth/calendar.events"]}'::jsonb,
        null, 'https://ai-work-workspace.buylife.xyz/calendar-sync', 62, true)
on conflict (key) do nothing;
select key, kind, connect_program_url from public.integration_catalog where key = 'google_calendar';
