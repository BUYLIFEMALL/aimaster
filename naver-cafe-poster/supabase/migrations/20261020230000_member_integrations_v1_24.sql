-- 2026-10-20 v1.24 (주인님 승인): 회원 연동 정보 공용 저장 ⑤단계 네이버 로그인 — 루트 docs/MEMBER_INTEGRATIONS.md
-- 표 구조 변경 없음. 백필: ncafe_accounts의 갱신 토큰이 있는 연결만, 공용 네이버 행이 아직 없는 회원에게 복사(원본 유지).
--   접근 토큰은 1시간짜리라 만료일로 거르지 않는다. app_ref = 회원 본인 naver_client_id(갱신 토큰은 발급 앱으로만 쓸 수 있음).

insert into public.member_platform_accounts
  (user_id, platform, external_id, username, access_token, refresh_token, token_expires_at, granted_scopes, app_ref, connected_via, created_at, updated_at)
select a.user_id, 'naver_login', a.naver_id, a.nickname, a.access_token, a.refresh_token, a.token_expires_at,
       '{}', k.api_key, 'naver-cafe-poster', a.created_at, a.updated_at
from public.ncafe_accounts a
left join public.user_api_keys k on k.user_id = a.user_id and k.provider = 'naver_client_id'
where coalesce(a.refresh_token, '') <> ''
  and k.api_key is not null  -- 2026-10-20 주인님 승인: 본인 앱 키가 없는 연결(예전 공용 앱 시절)은 공용 표에서 쓸 수 없어 옮기지 않는다
  and not exists (select 1 from public.member_platform_accounts m where m.user_id = a.user_id and m.platform = 'naver_login')
on conflict (user_id, platform, external_id) do nothing;

update public.programs set version = 'v1.24', updated_at = now() where slug = 'naver-cafe-poster';
