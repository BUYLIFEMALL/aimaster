-- AI 쇼핑몰 빌더 M5-1b — 몰 자기 도메인(예: myshop.co.kr) (2026-11-15 docs/PLAN_20261115_M5_DOMAIN_PAYMENT.md)
-- 백엔드 DB 번호 0090~0099(상호 인수인계 §2).
-- 1) mall_builder_stores.custom_domain: 소문자 주소 이름, 몰마다 하나, 전체에서 고유. buylife.xyz 계열은 하위 도메인(M5-1a)이 맡으므로 넣지 못함
-- 2) mall_builder_set_custom_domain(몰, 주소): 대표 운영사만. 빈 값이면 지움. 정리(소문자·https://·끝 점·www. 유지) 뒤 형식·중복 검사
-- 3) mall_builder_slug_by_domain(주소): 요청 주소 → 몰 이름(slug)만 돌려줌(공개 읽기 — proxy가 부름). 다른 칸은 내보내지 않음
-- Vercel에 도메인을 붙이는 일은 앱이 하지 않는다(주인님 결정: 백엔드 세션이 `vercel domains add` 명령으로).

alter table public.mall_builder_stores add column if not exists custom_domain text;

alter table public.mall_builder_stores drop constraint if exists mall_builder_stores_custom_domain_check;
alter table public.mall_builder_stores add constraint mall_builder_stores_custom_domain_check check (
  custom_domain is null or (
    custom_domain = lower(custom_domain)
    and length(custom_domain) <= 253
    and custom_domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$'
    and custom_domain <> 'buylife.xyz'
    and custom_domain not like '%.buylife.xyz'
    and custom_domain not like '%.vercel.app'
  )
);

create unique index if not exists mall_builder_stores_custom_domain_key
  on public.mall_builder_stores (custom_domain) where custom_domain is not null;

create or replace function public.mall_builder_set_custom_domain(p_store_id uuid, p_domain text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v text;
begin
  if not public.mall_builder_is_store_owner(p_store_id) then
    raise exception '대표 운영사만 도메인을 바꿀 수 있습니다.';
  end if;
  v := lower(btrim(coalesce(p_domain, '')));
  v := regexp_replace(v, '^https?://', '');
  v := regexp_replace(v, '[/?#].*$', '');
  v := regexp_replace(v, ':\d+$', '');
  v := regexp_replace(v, '\.+$', '');
  if v = '' then
    update public.mall_builder_stores set custom_domain = null where id = p_store_id;
    return null;
  end if;
  if v = 'buylife.xyz' or v like '%.buylife.xyz' then
    raise exception 'buylife.xyz 주소는 몰 하위 도메인으로 자동 연결됩니다. 직접 산 도메인만 넣어 주세요.';
  end if;
  if v like '%.vercel.app' or length(v) > 253
     or v !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$' then
    raise exception '도메인 형식이 맞지 않습니다(예: myshop.co.kr).';
  end if;
  if exists (select 1 from public.mall_builder_stores s where s.custom_domain = v and s.id <> p_store_id) then
    raise exception '이미 다른 몰이 쓰는 도메인입니다.';
  end if;
  update public.mall_builder_stores set custom_domain = v where id = p_store_id;
  return v;
end;
$$;

revoke all on function public.mall_builder_set_custom_domain(uuid, text) from public, anon;
grant execute on function public.mall_builder_set_custom_domain(uuid, text) to authenticated;

create or replace function public.mall_builder_slug_by_domain(p_domain text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.slug from public.mall_builder_stores s
   where p_domain is not null and s.custom_domain = lower(btrim(p_domain))
   limit 1
$$;

revoke all on function public.mall_builder_slug_by_domain(text) from public;
grant execute on function public.mall_builder_slug_by_domain(text) to anon, authenticated;
