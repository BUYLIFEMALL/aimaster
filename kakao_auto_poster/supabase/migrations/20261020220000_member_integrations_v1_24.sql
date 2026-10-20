-- 2026-10-20 v1.24 (주인님 승인): 회원 연동 정보 공용 저장 ⑤단계 카카오 — 루트 docs/MEMBER_INTEGRATIONS.md
-- 표 구조 변경 없음. 백필: user_kakao_accounts에서 갱신 토큰이 아직 살아 있는 연결만, 공용 카카오 행이 아직 없는 회원에게 복사(원본 유지).
--   app_ref = 회원 본인 kakao_rest_api_key(갱신 토큰은 발급 앱으로만 쓸 수 있음). 앱 키가 없는 옛 공용 앱 시절 연결은 app_ref가 비어 공용으로 쓰이지 않는다.

insert into public.member_platform_accounts
  (user_id, platform, external_id, username, access_token, refresh_token, token_expires_at, refresh_expires_at, granted_scopes, app_ref, connected_via, created_at, updated_at)
select a.user_id, 'kakao', a.kakao_user_id, a.nickname, a.access_token, a.refresh_token, a.token_expires_at, a.refresh_token_expires_at,
       '{talk_message}', k.api_key, 'kakao-auto-posting', a.created_at, a.updated_at
from public.user_kakao_accounts a
left join public.user_api_keys k on k.user_id = a.user_id and k.provider = 'kakao_rest_api_key'
where coalesce(a.refresh_token, '') <> ''
  and (a.refresh_token_expires_at is null or a.refresh_token_expires_at > now())
  and not exists (select 1 from public.member_platform_accounts m where m.user_id = a.user_id and m.platform = 'kakao')
on conflict (user_id, platform, external_id) do nothing;

update public.programs set version = 'v1.24', updated_at = now() where slug = 'kakao-auto-posting';
