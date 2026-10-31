-- 회원 본인 고정 IP 프록시 주소를 공용 표 user_api_keys에 저장한다(2026-10-31 주인님 지시: 본인 키 등록).
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 운영 DB의 허용 목록을 읽어 1개만 덧붙인다(다른 이름은 그대로).

do $$
declare
  def text;
  vals text[];
begin
  select pg_get_constraintdef(c.oid) into def
  from pg_constraint c
  where c.conrelid = 'public.user_api_keys'::regclass and c.conname = 'user_api_keys_provider_check';
  if def is null then
    raise exception 'user_api_keys_provider_check 제약을 찾지 못했습니다';
  end if;
  if def ~ '[{][^}]*[}]' then
    vals := regexp_split_to_array(substring(def from '[{]([^}]*)[}]'), ',');
  else
    select array_agg(distinct m[1]) into vals from regexp_matches(def, '''([^'']+)''', 'g') as m;
  end if;
  if coalesce(array_length(vals, 1), 0) < 10 then
    raise exception '허용 목록을 읽지 못했습니다(%)', def;
  end if;
  vals := array(select distinct unnest(vals || array['fixed_ip_proxy_url']) order by 1);
  alter table public.user_api_keys drop constraint user_api_keys_provider_check;
  execute format('alter table public.user_api_keys add constraint user_api_keys_provider_check check (provider = any (%L::text[]))', vals);
end $$;

insert into integration_catalog (key, kind, label, description, key_names, scope_sets, guide_id, sort_order)
values ('fixed_ip_proxy', 'api_key', '고정 IP 프록시(Fixie 등)', '허용 IP 등록이 필요한 API를 회원 본인 고정 IP로 호출하기 위한 프록시 주소.',
  '{fixed_ip_proxy_url}', '{}', null, 151)
on conflict (key) do nothing;

-- 확인
select pg_get_constraintdef(oid) like '%fixed_ip_proxy_url%' as allowed
from pg_constraint where conname = 'user_api_keys_provider_check';
select key, kind, label, key_names from integration_catalog where key = 'fixed_ip_proxy';
