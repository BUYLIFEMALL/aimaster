-- 2026-10-20 v1.13 (주인님 승인): 회원 연동 정보 공용 저장 ②단계 — 루트 docs/MEMBER_INTEGRATIONS.md
-- 표 구조 변경 없음. 백필: 이 프로그램 표(th_accounts)의 정상 연결(재연결 필요 아님·만료 전·계정 이름 있음)을
-- 댓글 권한과 함께 공용 표로 복사. 이미 공용 행이 있는 회원(threads에서 게시 권한으로 들어간 경우)은 건드리지 않는다 —
-- 그 회원은 공용 행에 댓글 권한이 없어 이 프로그램이 자기 표 토큰을 계속 쓴다. 원본은 그대로 둔다.
insert into public.member_platform_accounts
  (user_id, platform, external_id, username, access_token, token_expires_at, granted_scopes, app_ref, connected_via, created_at, updated_at)
select t.user_id, 'threads', t.threads_user_id, t.username, t.access_token, t.token_expires_at,
       '{threads_basic,threads_content_publish,threads_read_replies,threads_manage_replies}', k.api_key, 'threads-comment-reply', t.created_at, t.updated_at
from public.th_accounts t
left join public.user_api_keys k on k.user_id = t.user_id and k.provider = 'threads_app_id'
where t.needs_reconnect = false
  and (t.token_expires_at is null or t.token_expires_at > now())
  and t.username is not null
  and not exists (select 1 from public.member_platform_accounts m where m.user_id = t.user_id and m.platform = 'threads')
on conflict (user_id, platform, external_id) do nothing;

update public.programs set version = 'v1.13', updated_at = now() where slug = 'threads-comment-reply';
