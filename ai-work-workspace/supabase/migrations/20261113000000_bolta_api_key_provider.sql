-- 2026-11-13 세금계산서 볼타 바로 발급(플랜 ai-work-workspace/docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5, 주인님 「일단 볼타로 정리해」)
-- [운영 DB esgxyikcnnvmlhygjkth — Supabase SQL 편집기로 실행] 공용 user_api_keys 허용 목록에 'bolta_api_key' 추가.
-- 기준: ai-video-studio/supabase/migrations/20261111100000_runway_vidu_keys.sql 과 같은 방식 —
-- 현재 정의를 읽어 앞에 덧붙임(다른 프로그램이 넣은 값 보존, 두 번 실행해도 같음). 운영 정의 형식은 '{a,b,…}'::text[].
do $$ declare def text; v text; begin
  select pg_get_constraintdef(c.oid) into def from pg_constraint c join pg_class t on t.oid = c.conrelid
   where t.relname = 'user_api_keys' and c.conname = 'user_api_keys_provider_check';
  if def is null or position(chr(39) || chr(123) in def) = 0 then raise exception 'unexpected constraint format: %', def; end if;
  foreach v in array array['bolta_api_key'] loop
    if def !~ ('[{,]' || v || '[,}]') then def := replace(def, chr(39) || chr(123), chr(39) || chr(123) || v || ','); end if;
  end loop;
  execute 'alter table public.user_api_keys drop constraint user_api_keys_provider_check';
  execute 'alter table public.user_api_keys add constraint user_api_keys_provider_check ' || def;
end $$;
-- 확인용: bolta_api_key와 기존 값(runway·vidu·cronjob_org_api_key 등)이 함께 있는지
select pg_get_constraintdef(c.oid) as def from pg_constraint c join pg_class t on t.oid = c.conrelid
 where t.relname = 'user_api_keys' and c.conname = 'user_api_keys_provider_check';
