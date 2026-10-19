-- AIMaster_dev(ref rjjtjakljjxsgjelqgek) 전용 Lab 기반 구조 — docs/AIMASTER_DEV_LAB_GUIDELINES.md 1장
-- 운영 AIMaster(ref esgxyikcnnvmlhygjkth)에는 절대 적용하지 않는다.
--
-- 구조
--   public            : 공통 테이블 없음. Lab 프로그램마다 "<이름표>_*" 테이블만 둔다(Data API로 바로 사용).
--   lab_admin         : 관리 전용(API 비공개). Lab 등록부 + 등록/삭제 함수 + 자동 검사.
--   auth              : 모든 Lab이 함께 쓰는 로그인. 데이터는 RLS로 본인 것만.

create schema if not exists lab_admin;
revoke all on schema lab_admin from public, anon, authenticated;

-- 1) Lab 등록부
create table if not exists lab_admin.programs (
  name        text primary key check (name ~ '^[a-z][a-z0-9-]{1,40}$'),
  prefix      text not null unique,          -- 테이블 이름표: 이름의 - 를 _ 로 바꾸고 끝에 _ (예: card_demo_)
  bucket_prefix text not null unique,        -- 버킷 이름표: 이름 + - (예: card-demo-)
  purpose     text,
  url         text,
  status      text not null default 'active' check (status in ('active', 'deleted')),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
revoke all on lab_admin.programs from public, anon, authenticated;

-- 2) 등록: 테이블을 만들기 전에 반드시 먼저 실행
create or replace function lab_admin.register_program(p_name text, p_purpose text default null, p_url text default null)
returns lab_admin.programs
language plpgsql
set search_path = ''
as $$
declare
  v_row lab_admin.programs;
begin
  insert into lab_admin.programs (name, prefix, bucket_prefix, purpose, url)
  values (p_name, replace(p_name, '-', '_') || '_', p_name || '-', p_purpose, p_url)
  on conflict (name) do update
    set status = 'active', deleted_at = null,
        purpose = coalesce(excluded.purpose, lab_admin.programs.purpose),
        url = coalesce(excluded.url, lab_admin.programs.url)
  returning * into v_row;
  return v_row;
end;
$$;

-- 3) 삭제: 그 이름표의 public 테이블·뷰·함수를 지우고 등록부에 삭제 표시(Storage 버킷은 API로 따로 지운다)
create or replace function lab_admin.drop_program(p_name text)
returns text[]
language plpgsql
set search_path = ''
as $$
declare
  v_prefix text;
  v_dropped text[] := '{}';
  r record;
begin
  select prefix into v_prefix from lab_admin.programs where name = p_name;
  if v_prefix is null then
    raise exception '등록되지 않은 Lab입니다: %', p_name;
  end if;

  for r in select viewname as n from pg_views where schemaname = 'public' and left(viewname, length(v_prefix)) = v_prefix loop
    execute format('drop view if exists public.%I cascade', r.n);
    v_dropped := v_dropped || ('view ' || r.n);
  end loop;
  for r in select tablename as n from pg_tables where schemaname = 'public' and left(tablename, length(v_prefix)) = v_prefix loop
    execute format('drop table if exists public.%I cascade', r.n);
    v_dropped := v_dropped || ('table ' || r.n);
  end loop;
  for r in
    select p.oid::regprocedure::text as sig from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and left(p.proname, length(v_prefix)) = v_prefix
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
    v_dropped := v_dropped || ('function ' || r.sig);
  end loop;
  for r in
    select t.typname as n from pg_type t
    join pg_namespace ns on ns.oid = t.typnamespace
    where ns.nspname = 'public' and t.typtype = 'e' and left(t.typname, length(v_prefix)) = v_prefix
  loop
    execute format('drop type if exists public.%I cascade', r.n);
    v_dropped := v_dropped || ('type ' || r.n);
  end loop;

  update lab_admin.programs set status = 'deleted', deleted_at = now() where name = p_name;
  return v_dropped;
end;
$$;

revoke all on function lab_admin.register_program(text, text, text) from public, anon, authenticated;
revoke all on function lab_admin.drop_program(text) from public, anon, authenticated;

-- 4) 자동 검사: public에 새 테이블이 생기면
--    ① 등록된 Lab 이름표로 시작하지 않으면 거부(공통 테이블·이름표 실수 방지)
--    ② RLS를 자동으로 켠다(누구나 가입하므로 정책 없는 테이블은 아무도 못 읽게)
create or replace function lab_admin.enforce_lab_tables()
returns event_trigger
language plpgsql
set search_path = ''
as $$
declare
  obj record;
  v_table text;
begin
  for obj in select * from pg_event_trigger_ddl_commands() where command_tag = 'CREATE TABLE' and schema_name = 'public' loop
    v_table := split_part(obj.object_identity, '.', 2);
    v_table := trim(both '"' from v_table);
    if not exists (
      select 1 from lab_admin.programs
      where status = 'active' and left(v_table, length(prefix)) = prefix
    ) then
      raise exception 'Lab 이름표가 없는 테이블입니다: %. 먼저 select lab_admin.register_program(''<이름>''); 로 등록하고 "<이름표>_" 로 시작하는 이름을 쓰세요.', v_table;
    end if;
    execute format('alter table public.%I enable row level security', v_table);
  end loop;
end;
$$;

drop event trigger if exists lab_enforce_tables;
create event trigger lab_enforce_tables on ddl_command_end
  when tag in ('CREATE TABLE')
  execute function lab_admin.enforce_lab_tables();
