-- 2026-10-20 v1.30 (주인님 승인): 회원 연동 정보 공용 저장 ④단계 Instagram — 루트 docs/MEMBER_INTEGRATIONS.md
-- 표 구조 변경 없음(공용 표는 루트 supabase/migrations/0039_member_integrations.sql).
-- 백필: 이 프로그램 표(insta_accounts)의 만료되지 않은 연결만 공용 표로 복사한다. 원본은 그대로 둔다.
--   로그인 방식(auth_method)과 페이지 ID(extra.page_id)를 함께 옮긴다 — Facebook·Instagram 로그인 토큰은 서로 바꿔 쓸 수 없다.
--   권한은 이 프로그램이 요청하는 목록(lib/instagram/memberAccount.ts REQUESTED_SCOPES)과 같다.
--   app_ref: Instagram 로그인 = meta_app_id, Facebook 로그인 = facebook_app_id(없으면 meta_app_id) — 연결 때 쓴 순서와 같다.

insert into public.member_platform_accounts
  (user_id, platform, external_id, username, access_token, token_expires_at, granted_scopes, auth_method, app_ref, extra, connected_via, created_at, updated_at)
select a.user_id, 'instagram', a.ig_user_id, a.ig_username, a.access_token, a.token_expires_at,
       case when a.auth_method = 'instagram_login'
            then '{instagram_business_basic,instagram_business_content_publish}'::text[]
            else '{instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management}'::text[] end,
       a.auth_method,
       case when a.auth_method = 'instagram_login' then km.api_key else coalesce(kf.api_key, km.api_key) end,
       case when a.page_id is not null then jsonb_build_object('page_id', a.page_id) else '{}'::jsonb end,
       'auto-instagram-posting', a.created_at, a.updated_at
from public.insta_accounts a
left join public.user_api_keys km on km.user_id = a.user_id and km.provider = 'meta_app_id'
left join public.user_api_keys kf on kf.user_id = a.user_id and kf.provider = 'facebook_app_id'
where (a.token_expires_at is null or a.token_expires_at > now())
  and (a.auth_method = 'instagram_login' or a.page_id is not null)
on conflict (user_id, platform, external_id) do nothing;

update public.programs set version = 'v1.30', updated_at = now() where slug = 'auto-instagram-posting';
