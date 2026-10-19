-- 2026-10-20 v2.11 (주인님 승인): 회원 연동 정보 공용 저장 ③단계 — 루트 docs/MEMBER_INTEGRATIONS.md
-- 표 구조 변경 없음. 백필: 이 프로그램 표(tco_threads_accounts, 계정 여러 개 가능)의 만료 전·토큰 있는 연결을 게시 권한으로 공용 표에 복사하되,
-- 이미 공용 Threads 행이 있는 회원은 건드리지 않는다(다른 프로그램 토큰을 덮어쓰지 않음). 원본은 그대로 둔다.
insert into public.member_platform_accounts
  (user_id, platform, external_id, username, access_token, token_expires_at, granted_scopes, app_ref, connected_via, created_at, updated_at)
select t.user_id, 'threads', t.threads_user_id, t.username, t.access_token, t.token_expires_at,
       '{threads_basic,threads_content_publish}', k.api_key, 'threads-content-ops', t.created_at, t.updated_at
from public.tco_threads_accounts t
left join public.user_api_keys k on k.user_id = t.user_id and k.provider = 'threads_app_id'
where t.access_token <> ''
  and (t.token_expires_at is null or t.token_expires_at > now())
  and not exists (select 1 from public.member_platform_accounts m where m.user_id = t.user_id and m.platform = 'threads')
on conflict (user_id, platform, external_id) do nothing;

update public.programs set version = 'v2.11', updated_at = now() where slug = 'threads-content-ops';
