-- 2026-09-07: Facebook 로그인(기본) + Instagram Login(BYOK, 대체) 두 가지 연동 방식을
-- 함께 지원하기 위해 insta_accounts에 auth_method 컬럼을 추가한다.
-- 기존 행은 page_id 유무로 방식을 역추정해서 백필한다
-- (0005에서 BYOK 전환 기간 동안 연결된 행은 page_id가 null이라 instagram_login으로 분류됨).
alter table public.insta_accounts add column if not exists auth_method text not null default 'facebook_login';

update public.insta_accounts set auth_method = 'instagram_login' where page_id is null;

alter table public.insta_accounts
  add constraint insta_accounts_auth_method_check check (auth_method in ('facebook_login', 'instagram_login'));
