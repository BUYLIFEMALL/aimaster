-- v1.50 (2026-10-22): 🔍 인기 게시물 수집(Facebook 페이지 방식 회원은 공식 API business_discovery, 그 밖·해시태그는 회원 본인 Apify 토큰) + 긴 릴스(최대 3분)·장면 시점 표시.
-- [운영 DB에 2026-10-22 주인님 승인 후 크롬 Supabase SQL 편집기로 실행함] 공용 user_api_keys 허용 목록에 'apify' 추가(기존 이름 그대로).
do $$ declare def text; begin
  select pg_get_constraintdef(c.oid) into def from pg_constraint c join pg_class t on t.oid = c.conrelid
   where t.relname = 'user_api_keys' and c.conname = 'user_api_keys_provider_check';
  if def !~ '[{,]apify[,}]' then def := replace(def, chr(39) || chr(123), chr(39) || chr(123) || 'apify,'); end if;
  execute 'alter table public.user_api_keys drop constraint user_api_keys_provider_check';
  execute 'alter table public.user_api_keys add constraint user_api_keys_provider_check ' || def;
end $$;
update public.programs set version='v1.50', updated_at=now() where slug='auto-instagram-posting';
