-- 회원 본인 Hugging Face 읽기 토큰을 공용 표 user_api_keys에 저장한다(v1.12에서 화면만 만들고 허용 목록을 빠뜨림 —
-- 2026-11-05 마스터PC 저장 시 「violates check constraint user_api_keys_provider_check」).
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 운영 DB의 허용 목록을 읽어 1개만 덧붙인다(다른 이름은 그대로, coupang-ops 20261031과 같은 방식).

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
  vals := array(select distinct unnest(vals || array['huggingface']) order by 1);
  alter table public.user_api_keys drop constraint user_api_keys_provider_check;
  execute format('alter table public.user_api_keys add constraint user_api_keys_provider_check check (provider = any (%L::text[]))', vals);
end $$;

insert into integration_catalog (key, kind, label, description, key_names, scope_sets, guide_id, sort_order)
values ('huggingface', 'api_key', 'Hugging Face 토큰', '약관 동의가 필요한 공개 AI 모델(예: Stable Audio 3)을 회원 PC가 처음 받을 때 쓰는 회원 본인 읽기(Read) 토큰.',
  '{huggingface}', '{}', null, 152)
on conflict (key) do nothing;

-- 확인
select pg_get_constraintdef(oid) like '%huggingface%' as allowed
from pg_constraint where conname = 'user_api_keys_provider_check';
select key, kind, label, key_names from integration_catalog where key = 'huggingface';
