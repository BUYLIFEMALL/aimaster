-- 2026-10-20 v1.14 (주인님 승인): 회원 연동 정보 공용 저장 ⑤단계 YouTube — 루트 docs/MEMBER_INTEGRATIONS.md
-- 표 구조 변경 없음. 백필: ytreply_accounts의 재연결 필요가 아니고 갱신 토큰이 있는 연결만, 공용 YouTube 행이 아직 없는 회원에게 복사(원본 유지).
--   접근 토큰은 1시간짜리라 만료돼도 갱신 토큰으로 다시 받으므로 만료일로 거르지 않는다. app_ref = 회원 본인 google_client_id.

insert into public.member_platform_accounts
  (user_id, platform, external_id, username, access_token, refresh_token, token_expires_at, granted_scopes, app_ref, connected_via, created_at, updated_at)
select a.user_id, 'youtube', a.channel_id, a.channel_title, a.access_token, a.refresh_token, a.token_expires_at,
       '{https://www.googleapis.com/auth/youtube.force-ssl}', k.api_key, 'youtube-auto-reply', a.created_at, now()
from public.ytreply_accounts a
left join public.user_api_keys k on k.user_id = a.user_id and k.provider = 'google_client_id'
where not a.needs_reconnect and coalesce(a.refresh_token, '') <> ''
  and not exists (select 1 from public.member_platform_accounts m where m.user_id = a.user_id and m.platform = 'youtube')
on conflict (user_id, platform, external_id) do nothing;

update public.programs set version = 'v1.14', updated_at = now() where slug = 'youtube-auto-reply';
