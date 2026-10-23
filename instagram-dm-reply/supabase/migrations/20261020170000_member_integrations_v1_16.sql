-- 2026-10-20 v1.16 (주인님 승인): 회원 연동 정보 공용 저장 ④단계 Instagram — 루트 docs/MEMBER_INTEGRATIONS.md
-- 표 구조 변경 없음. 백필: dm_accounts의 만료되지 않고 재연결 필요가 아닌 연결만, 공용 Instagram 행이 아직 없는 회원에게 복사(원본 유지).
--   이미 공용 행이 있는 회원(INSTA에서 연결)은 건드리지 않는다 — 권한이 다르면 이 프로그램은 자기 표 토큰을 계속 쓴다.

insert into public.member_platform_accounts
  (user_id, platform, external_id, username, access_token, token_expires_at, granted_scopes, auth_method, app_ref, connected_via, created_at, updated_at)
select a.user_id, 'instagram', a.instagram_user_id, a.username, a.access_token, a.token_expires_at,
       '{instagram_business_basic,instagram_business_manage_messages}', 'instagram_login', k.api_key, 'instagram-dm-reply', a.created_at, a.updated_at
from public.dm_accounts a
left join public.user_api_keys k on k.user_id = a.user_id and k.provider = 'meta_app_id'
where (a.token_expires_at is null or a.token_expires_at > now())
  and not a.needs_reconnect
  and not exists (select 1 from public.member_platform_accounts m where m.user_id = a.user_id and m.platform = 'instagram')
on conflict (user_id, platform, external_id) do nothing;

update public.programs set version = 'v1.16', updated_at = now() where slug = 'instagram-dm-reply';
