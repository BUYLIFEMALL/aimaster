-- 2026-10-20 v1.21 (주인님 승인): 회원 연동 정보 공용 저장 ④단계 Instagram — 루트 docs/MEMBER_INTEGRATIONS.md
-- 표 구조 변경 없음. 백필: instagram_accounts(Facebook 로그인)의 만료되지 않은 연결만, 공용 Instagram 행이 아직 없는 회원에게 복사(원본 유지).
--   app_ref는 이 프로그램이 연결에 쓰는 meta_app_id.

insert into public.member_platform_accounts
  (user_id, platform, external_id, username, access_token, token_expires_at, granted_scopes, auth_method, app_ref, extra, connected_via, created_at, updated_at)
select a.user_id, 'instagram', a.ig_user_id, a.ig_username, a.access_token, a.token_expires_at,
       '{instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management}', 'facebook_login', k.api_key,
       case when a.page_id is not null then jsonb_build_object('page_id', a.page_id) else '{}'::jsonb end,
       'auto-shorts-posting', a.created_at, a.updated_at
from public.instagram_accounts a
left join public.user_api_keys k on k.user_id = a.user_id and k.provider = 'meta_app_id'
where (a.token_expires_at is null or a.token_expires_at > now())
  and not exists (select 1 from public.member_platform_accounts m where m.user_id = a.user_id and m.platform = 'instagram')
on conflict (user_id, platform, external_id) do nothing;

update public.programs set version = 'v1.21', updated_at = now() where slug = 'auto-shorts-posting';
