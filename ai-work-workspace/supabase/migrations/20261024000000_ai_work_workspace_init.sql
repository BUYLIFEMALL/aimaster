-- AI 업무 워크스페이스 자동화 (ai-work-workspace) 초기 설정 — 2026-10-24
-- 대상: ① AIMaster 운영 공용 DB (ref esgxyikcnnvmlhygjkth). 주인님 승인: 2026-10-24 「진행해」(1단계 표 생성), DB 연결 A안.
--
-- 구조: 이 프로그램의 데이터는 전용 스키마 `aww`에만 둔다. 전용 DB 계정 `aww_app`이 스키마 주인이고,
-- 서버(Vercel 함수)만 AWW_DATABASE_URL로 이 계정을 써서 접속한다.
--   * anon / authenticated(브라우저·PostgREST) 계정은 스키마 사용 권한이 없어 이 표들에 전혀 접근할 수 없다.
--     (PostgREST 노출 스키마 목록에도 넣지 않는다.) 회원 간 격리는 서버의 litpage 권한 판정(records.ts·authz.ts)과
--     workspace(space_id) 조건으로 한다.
--   * aww_app은 public 스키마의 공용 표(profiles·programs 등)에 권한이 없다. 이용 권한 판정과 회원 API 키는
--     기존 프로그램과 같이 service role(createAdminClient)로 읽는다.
-- 표(records·changes·search_index 등)는 서버가 처음 켜질 때 CREATE TABLE IF NOT EXISTS로 만든다(원본 방식 유지).
-- 비밀번호는 이 파일에 넣지 않는다. 적용 후 별도로 ALTER ROLE aww_app PASSWORD … 를 실행하고 그 값은 Vercel 환경변수에만 둔다.

-- 1) 전용 계정 (비밀번호 없이 만들고, 적용 후 따로 지정)
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'aww_app') then
    create role aww_app login noinherit;
  end if;
end $$;
-- 실행 계정(postgres)이 aww_app 소유로 스키마·함수를 만들 수 있게 구성원으로 넣는다
grant aww_app to current_user;

-- 2) 전용 스키마
create schema if not exists aww authorization aww_app;
revoke all on schema aww from public;
grant usage, create on schema aww to aww_app;

-- 3) 전문 검색용 확장 (Supabase는 extensions 스키마에 둔다)
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
grant usage on schema extensions to aww_app;

-- 4) 접속하면 aww → extensions 순서로 이름을 찾게 한다 (연결 풀 transaction 모드에서도 계정 기본값으로 적용)
alter role aww_app set search_path = aww, extensions;
-- 한 질의가 오래 걸려도 Vercel 함수 제한(300초) 안에서 끊기게 한다
alter role aww_app set statement_timeout = '60s';

-- 5) SQLite 함수 대체 (원본 SQL을 그대로 쓰기 위함, pg/translate.ts 참고)
--    json_extract(text, '$.a.b') → 문자 값 (SQLite처럼 없는 경로는 NULL)
create or replace function aww.json_extract(d text, p text) returns text
  language sql immutable parallel safe
  as $$ select case when d is null or p is null then null
                    else (d::jsonb) #>> string_to_array(regexp_replace(p, '^\$\.?', ''), '.') end $$;
--    json_num: 숫자로 비교·정렬할 때 (원본 코드에서 숫자 비교하는 곳만 이 함수로 바꿈)
create or replace function aww.json_num(d text, p text) returns numeric
  language sql immutable parallel safe
  as $$ select case when jsonb_typeof((d::jsonb) #> string_to_array(regexp_replace(p, '^\$\.?', ''), '.')) = 'number'
                    then ((d::jsonb) #>> string_to_array(regexp_replace(p, '^\$\.?', ''), '.'))::numeric end $$;
--    json_true: JSON true면 참 (SQLite는 true를 1로 돌려줌)
create or replace function aww.json_true(d text, p text) returns boolean
  language sql immutable parallel safe
  as $$ select coalesce(((d::jsonb) #> string_to_array(regexp_replace(p, '^\$\.?', ''), '.')) = 'true'::jsonb, false) $$;
create or replace function aww.json_valid(d text) returns boolean
  language plpgsql immutable parallel safe
  as $$ begin perform d::jsonb; return true; exception when others then return false; end $$;
alter function aww.json_extract(text, text) owner to aww_app;
alter function aww.json_num(text, text) owner to aww_app;
alter function aww.json_true(text, text) owner to aww_app;
alter function aww.json_valid(text) owner to aww_app;
