-- AI 쿠팡 운영 자동화 C1-2 — 쿠팡 WING Open API 회원 키를 공용 표 user_api_keys에 저장할 수 있게 한다.
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 적용은 주인님 승인 뒤 크롬 SQL 편집기에서(20261028_coupang_ops_v1_01.sql과 함께).
-- 키 이름 제약은 여러 세션이 바꿔 왔으므로, 지금 운영 DB의 허용 목록을 읽어 4개만 덧붙인다(다른 이름은 그대로).

do $$
declare
  def text;
  vals text[];
  add_vals text[] := array['coupang_wing_vendor_id', 'coupang_wing_access_key', 'coupang_wing_secret_key', 'coupang_wing_user_id'];
begin
  select pg_get_constraintdef(c.oid) into def
  from pg_constraint c
  where c.conrelid = 'public.user_api_keys'::regclass and c.conname = 'user_api_keys_provider_check';
  if def is null then
    raise exception 'user_api_keys_provider_check 제약을 찾지 못했습니다';
  end if;
  -- 두 모양 모두: ANY ('{a,b,c}'::text[]) 배열 한 덩어리 / ARRAY['a'::text, 'b'::text]
  if def ~ '[{][^}]*[}]' then
    vals := regexp_split_to_array(substring(def from '[{]([^}]*)[}]'), ',');
  else
    select array_agg(distinct m[1]) into vals from regexp_matches(def, '''([^'']+)''', 'g') as m;
  end if;
  if coalesce(array_length(vals, 1), 0) < 10 then
    raise exception '허용 목록을 읽지 못했습니다(%)', def;
  end if;
  vals := array(select distinct unnest(vals || add_vals) order by 1);
  alter table public.user_api_keys drop constraint user_api_keys_provider_check;
  execute format('alter table public.user_api_keys add constraint user_api_keys_provider_check check (provider = any (%L::text[]))', vals);
end $$;

insert into integration_catalog (key, kind, label, description, key_names, scope_sets, guide_id, sort_order)
values ('coupang_wing', 'api_key', '쿠팡 WING Open API', '쿠팡 판매자 본인 Open API 키(자체개발, 허용 IP 등록). 쿠팡 파트너스 키와 다름.',
  '{coupang_wing_vendor_id,coupang_wing_access_key,coupang_wing_secret_key,coupang_wing_user_id}', '{}', null, 150)
on conflict (key) do nothing;

-- 확인: 새 이름 4개가 허용 목록에 있는지, 카탈로그 한 줄
select pg_get_constraintdef(oid) like '%coupang_wing_secret_key%' as wing_allowed
from pg_constraint where conname = 'user_api_keys_provider_check';
select key, kind, label, key_names from integration_catalog where key = 'coupang_wing';
