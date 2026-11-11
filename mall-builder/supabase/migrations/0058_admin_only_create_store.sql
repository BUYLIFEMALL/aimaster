-- T0(2026-11-12, 주인님 결정 「화면 + DB 둘 다」): 운영(AIMaster 운영 DB)에서는 몰 만들기를 AIMaster 관리자(profiles.is_admin)만.
-- public.profiles 표와 is_admin 칸이 있을 때만 검사한다 → Lab(AIMaster_dev)·배포 키트는 지금처럼 로그인한 누구나.
-- 기존 함수 본문에서 정확히 한 군데만 바꾼다(pg_temp.swap, 0057과 같은 방식).
create or replace function pg_temp.swap(src text, a text, b text, what text) returns text language plpgsql as $f$
begin
  if (char_length(src) - char_length(replace(src, a, ''))) / char_length(a) <> 1 then raise exception '문구를 1번 찾지 못함: %', what; end if;
  return replace(src, a, b);
end $f$;

do $m$
declare src text;
begin
  src := pg_get_functiondef('public.mall_builder_create_store(text,text)'::regprocedure);
  src := pg_temp.swap(src, E'  v_id uuid;\nbegin\n', E'  v_id uuid;\n  v_admin boolean;\nbegin\n', '변수');
  src := pg_temp.swap(src,
    E'    raise exception ''로그인이 필요합니다.'' using errcode = ''42501'';\n  end if;\n',
    E'    raise exception ''로그인이 필요합니다.'' using errcode = ''42501'';\n  end if;\n'
    || E'  if exists (select 1 from information_schema.columns where table_schema = ''public'' and table_name = ''profiles'' and column_name = ''is_admin'') then\n'
    || E'    execute ''select coalesce((select p.is_admin from public.profiles p where p.id = $1), false)'' into v_admin using v_uid;\n'
    || E'    if not v_admin then raise exception ''몰 만들기는 관리자만 할 수 있습니다.'' using errcode = ''42501''; end if;\n'
    || E'  end if;\n',
    '관리자 검사');
  execute src;
end $m$;
