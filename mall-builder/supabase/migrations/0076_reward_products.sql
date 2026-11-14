-- AI 쇼핑몰 빌더 M1-8 — 리워드 상품(본사 상품 리셀러율 · 리셀러 추가율 중복 차단) (2026-11-15 마스터 플랜 §4 M1-8, 리워드 플랜 §0 「상품별 리셀러 수수료 중복 차단」)
-- 공급사 상품의 리셀러율은 공급사가 정한다(0068 product_supply.reseller_rate, 공급가에 반영). 본사(직접 파는) 상품은 본사가 정한다(products.reward_rate — 공급가 없음).
-- reward_no_extra = 그 상품은 리셀러별 추가율을 더하지 않음(상품 리셀러율만). 리워드 계산(0074 reward_make)이 이 둘을 읽도록 교체.
-- 추가·함수 교체만(drop 없음).

alter table public.mall_builder_products add column if not exists reward_rate numeric(5, 2) not null default 0;
alter table public.mall_builder_products add column if not exists reward_no_extra boolean not null default false;
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_products_reward_rate_chk') then
    alter table public.mall_builder_products add constraint mall_builder_products_reward_rate_chk check (reward_rate >= 0 and reward_rate <= 50);
  end if;
end $c$;

-- 1. 지급 예정 만들기(0074 교체): 공급사 상품 = 공급사율, 본사 상품 = 본사율, 중복 차단이면 리셀러 추가율 0
create or replace function mall_builder_private.reward_make(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  r public.mall_builder_resellers%rowtype;
begin
  select * into o from public.mall_builder_orders x where x.id = p_order;
  if o.id is null or o.reseller_id is null then return; end if;
  select * into r from public.mall_builder_resellers x where x.id = o.reseller_id and x.active;
  if r.id is null then return; end if;
  insert into public.mall_builder_reseller_rewards (store_id, reseller_id, order_id, order_item_id, product_id, name_snapshot, base_amount, product_rate, reseller_rate, amount)
  select o.store_id, r.id, o.id, i.id, i.product_id, coalesce(i.name_snapshot, ''), b.base, x.prate, x.rrate,
         floor(b.base * (x.prate + x.rrate) / 100)::bigint
    from public.mall_builder_order_items i
    join mall_builder_private.reward_bases(o.id) b on b.item_id = i.id
    left join public.mall_builder_products p on p.id = i.product_id
    left join public.mall_builder_product_supply ps on ps.product_id = i.product_id
    cross join lateral (select case when ps.product_id is not null then coalesce(ps.reseller_rate, 0) else coalesce(p.reward_rate, 0) end as prate,
                               case when coalesce(p.reward_no_extra, false) then 0 else r.rate end as rrate) x
   where i.order_id = o.id and x.prate + x.rrate > 0
  on conflict (order_item_id) do nothing;
end;
$$;
revoke all on function mall_builder_private.reward_make(uuid) from public, anon, authenticated;

-- 2. 몰 대표: 리워드 상품 일괄 — 본사 상품 리셀러율(공급사 상품은 공급사가 정하므로 건너뜀)·중복 차단. null = 그대로
create or replace function public.mall_builder_reward_products_set(p_store_id uuid, p_product_ids uuid[], p_rate numeric, p_no_extra boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer := 0; v_m integer := 0;
begin
  if auth.uid() is null or not coalesce(public.mall_builder_staff_can(p_store_id, 'owner'), false) then raise exception '몰 대표만 바꿀 수 있습니다.'; end if;
  if p_product_ids is null or cardinality(p_product_ids) = 0 then raise exception '상품을 골라 주세요.'; end if;
  if cardinality(p_product_ids) > 500 then raise exception '한 번에 500개까지 바꿀 수 있습니다.'; end if;
  if p_rate is not null and (p_rate < 0 or p_rate > 50) then raise exception '리셀러율은 0~50%% 사이로 적어 주세요.'; end if;
  if p_rate is null and p_no_extra is null then raise exception '바꿀 값을 적어 주세요.'; end if;
  if p_rate is not null then
    update public.mall_builder_products p set reward_rate = round(p_rate, 2), updated_at = now()
     where p.store_id = p_store_id and p.id = any (p_product_ids)
       and not exists (select 1 from public.mall_builder_product_supply ps where ps.product_id = p.id);
    get diagnostics v_n = row_count;
  end if;
  if p_no_extra is not null then
    update public.mall_builder_products p set reward_no_extra = p_no_extra, updated_at = now()
     where p.store_id = p_store_id and p.id = any (p_product_ids);
    get diagnostics v_m = row_count;
  end if;
  perform mall_builder_private.staff_log(p_store_id, 'reward_products_set', 'product', cardinality(p_product_ids)::text, coalesce(p_rate::text, '-') || '/' || coalesce(p_no_extra::text, '-'));
  return greatest(v_n, v_m);
end;
$$;
revoke all on function public.mall_builder_reward_products_set(uuid, uuid[], numeric, boolean) from public, anon;
grant execute on function public.mall_builder_reward_products_set(uuid, uuid[], numeric, boolean) to authenticated;
