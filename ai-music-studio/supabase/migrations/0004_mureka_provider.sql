-- 2026-10-23 Mureka 연동 준비(코드만, MUREKA_ENABLED=false) — ⚠️ 아직 적용하지 않음.
-- Mureka를 켤 때(주인님 승인 후) 운영 DB(ref esgxyikcnnvmlhygjkth)에 한 번 실행한다. 표 구조는 그대로, 허용 이름만 넓힌다.

-- 1) 곡 표: 공급자 이름에 mureka 추가
alter table public.ams_generations drop constraint if exists ams_generations_provider_check;
alter table public.ams_generations add constraint ams_generations_provider_check
  check (provider in ('gemini','elevenlabs','fal','replicate','suno','mureka'));

-- 2) 공용 user_api_keys 허용 목록에 mureka가 없으면 추가(0002와 같은 방식 — 기존 이름은 그대로)
do $$ declare def text; orig text; p text; begin
  select pg_get_constraintdef(c.oid) into def from pg_constraint c join pg_class t on t.oid = c.conrelid
   where t.relname = 'user_api_keys' and c.conname = 'user_api_keys_provider_check';
  if def is null then return; end if;
  orig := def;
  foreach p in array array['mureka'] loop
    if def !~ ('[{,]' || p || '[,}]') then def := replace(def, chr(39) || chr(123), chr(39) || chr(123) || p || ','); end if;
  end loop;
  if def = orig then return; end if;
  execute 'alter table public.user_api_keys drop constraint user_api_keys_provider_check';
  execute 'alter table public.user_api_keys add constraint user_api_keys_provider_check ' || def;
end $$;
