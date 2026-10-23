-- 2026-10-20 v1.21 (주인님 승인): 회원 연동 정보 공용 저장 ②단계 Threads 시범 — 루트 docs/MEMBER_INTEGRATIONS.md
-- 표 구조 변경 없음(공용 표는 루트 supabase/migrations/0039_member_integrations.sql).
-- 백필: 이 프로그램 표(threads_accounts)의 만료되지 않은 연결만 공용 표로 복사한다. 원본은 그대로 둔다.
--   다른 프로그램 표(tap_/tco_/th_accounts)는 그 프로그램을 전환할 때 복사한다 — 만료·폐기된 토큰이 정상 토큰보다 먼저 쓰이는 일을 막기 위해.
--   app_ref는 회원 본인 Threads 앱 ID(user_api_keys.threads_app_id), 이미 공용 행이 있으면 건드리지 않는다.

insert into public.member_platform_accounts
  (user_id, platform, external_id, username, access_token, token_expires_at, granted_scopes, app_ref, connected_via, created_at, updated_at)
select t.user_id, 'threads', t.threads_user_id, t.username, t.access_token, t.token_expires_at,
       '{threads_basic,threads_content_publish}', k.api_key, 'auto-threads-posting', t.created_at, t.updated_at
from public.threads_accounts t
left join public.user_api_keys k on k.user_id = t.user_id and k.provider = 'threads_app_id'
where t.token_expires_at is null or t.token_expires_at > now()
on conflict (user_id, platform, external_id) do nothing;

update public.programs set version = 'v1.21', updated_at = now() where slug = 'auto-threads-posting';
