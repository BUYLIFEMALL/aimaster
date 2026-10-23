-- v1.26 (2026-10-22): 본인 목소리 복제(ElevenLabs). 표 구조 변경 없음 — 버전만.
update public.programs set version='v1.26', updated_at=now() where slug='shorts-onestop-studio';

-- [운영 DB에 2026-10-22 03:5x KST 주인님 승인 후 크롬 Supabase SQL 편집기로 실행함]
-- 공용 user_api_keys 허용 목록에 'fal'(v1.23 AI 영상 선택 업체)·'elevenlabs'(v1.26) 추가. 기존 이름은 그대로 두고 두 이름만 앞에 붙임.
-- 저장소의 supabase/migrations/0013_update_user_api_keys_provider_check.sql(fal 포함)은 운영에 반영돼 있지 않았다(실행 전 운영 정의에 fal 없음).
do $$ declare def text; begin
  select pg_get_constraintdef(c.oid) into def from pg_constraint c join pg_class t on t.oid = c.conrelid
   where t.relname = 'user_api_keys' and c.conname = 'user_api_keys_provider_check';
  if def !~ '[{,]fal[,}]' then def := replace(def, chr(39) || chr(123), chr(39) || chr(123) || 'fal,'); end if;
  if def !~ '[{,]elevenlabs[,}]' then def := replace(def, chr(39) || chr(123), chr(39) || chr(123) || 'elevenlabs,'); end if;
  execute 'alter table public.user_api_keys drop constraint user_api_keys_provider_check';
  execute 'alter table public.user_api_keys add constraint user_api_keys_provider_check ' || def;
end $$;
