-- 2026-11-11 Runway·Vidu 직접 연동(플랜 ai-video-studio/docs/PLAN_20261111_RUNWAY_VIDU_DIRECT.md, 주인님 승인)
-- [운영 DB esgxyikcnnvmlhygjkth — 크롬(ego) Supabase SQL 편집기로 실행] 공용 user_api_keys 허용 목록에 'runway'·'vidu' 추가.
-- 현재 정의를 읽어 앞에 덧붙임(다른 프로그램이 넣은 값 보존, 두 번 실행해도 같음). 운영 정의 형식은 '{a,b,…}'::text[].
do $$ declare def text; v text; begin
  select pg_get_constraintdef(c.oid) into def from pg_constraint c join pg_class t on t.oid = c.conrelid
   where t.relname = 'user_api_keys' and c.conname = 'user_api_keys_provider_check';
  if def is null or position(chr(39) || chr(123) in def) = 0 then raise exception 'unexpected constraint format: %', def; end if;
  foreach v in array array['runway', 'vidu'] loop
    if def !~ ('[{,]' || v || '[,}]') then def := replace(def, chr(39) || chr(123), chr(39) || chr(123) || v || ','); end if;
  end loop;
  execute 'alter table public.user_api_keys drop constraint user_api_keys_provider_check';
  execute 'alter table public.user_api_keys add constraint user_api_keys_provider_check ' || def;
end $$;
-- 확인용: runway·vidu와 기존 값(apify·tavily·upstage 등)이 함께 있는지
select pg_get_constraintdef(c.oid) as def from pg_constraint c join pg_class t on t.oid = c.conrelid
 where t.relname = 'user_api_keys' and c.conname = 'user_api_keys_provider_check';
