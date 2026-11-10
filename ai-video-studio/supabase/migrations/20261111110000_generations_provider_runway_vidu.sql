-- 2026-11-11 v1.34 Runway·Vidu 실생성 시험 중 발견: avs_generations.provider 제한이 gemini·fal·replicate뿐이라 저장 실패(업체 호출 전이라 비용 없음).
-- [운영 DB esgxyikcnnvmlhygjkth — ego Supabase SQL 편집기로 실행] 현재 정의를 읽어 'runway'·'vidu'만 덧붙임(기존 값 보존, 두 번 실행해도 같음).
do $$ declare cname text; def text; begin
  select c.conname, pg_get_constraintdef(c.oid) into cname, def
    from pg_constraint c join pg_class t on t.oid = c.conrelid
   where t.relname = 'avs_generations' and c.contype = 'c' and pg_get_constraintdef(c.oid) ilike '%provider%';
  if cname is null then raise exception 'provider check constraint not found'; end if;
  if def ilike '%runway%' and def ilike '%vidu%' then return; end if;
  if position('ARRAY[' in def) = 0 then raise exception 'unexpected constraint format: %', def; end if;
  def := replace(def, 'ARRAY[', 'ARRAY[''runway''::text, ''vidu''::text, ');
  execute format('alter table public.avs_generations drop constraint %I', cname);
  execute format('alter table public.avs_generations add constraint %I ', cname) || def;
end $$;
-- 확인용
select c.conname, pg_get_constraintdef(c.oid) as def from pg_constraint c join pg_class t on t.oid = c.conrelid
 where t.relname = 'avs_generations' and c.contype = 'c';
