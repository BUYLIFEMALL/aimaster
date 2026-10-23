-- AI 업무 워크스페이스 — 전용 DB 계정(aww_app) 비밀번호를 사람·화면·환경변수에 두지 않는 설정 (2026-10-24)
-- 대상: ① AIMaster 운영 공용 DB (ref esgxyikcnnvmlhygjkth). 주인님 승인: 2026-10-24 DB 연결 A안.
--
-- 1) Supabase Vault가 무작위 비밀번호를 만들어 암호화 보관한다(이 파일·SQL 결과 화면에 값이 나오지 않음).
-- 2) aww_app 계정 비밀번호를 그 값으로 지정한다(DB 안에서만 전달).
-- 3) 서버 작업 스레드(pgworker.mjs)는 처음 접속할 때 service role 키로 public.aww_db_password()를 한 번 불러 값을 읽는다.
--    anon·authenticated(브라우저·회원) 계정은 이 함수를 실행할 수 없다.
-- 다시 실행해도 안전하다(이미 있으면 기존 비밀번호를 유지). 비밀번호를 바꾸려면 vault.update_secret 후 2)만 다시 실행.

do $$
declare
  pw text;
begin
  if not exists (select 1 from vault.secrets where name = 'aww_app_db_password') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'aww_app_db_password', 'ai-work-workspace 전용 DB 계정 비밀번호');
  end if;
  select decrypted_secret into pw from vault.decrypted_secrets where name = 'aww_app_db_password';
  execute format('alter role aww_app password %L', pw);
end $$;

create or replace function public.aww_db_password()
  returns text
  language sql
  security definer
  set search_path = ''
  as $$ select decrypted_secret from vault.decrypted_secrets where name = 'aww_app_db_password' $$;

revoke all on function public.aww_db_password() from public;
revoke all on function public.aww_db_password() from anon;
revoke all on function public.aww_db_password() from authenticated;
grant execute on function public.aww_db_password() to service_role;
