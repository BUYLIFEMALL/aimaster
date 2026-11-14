-- AI 쇼핑몰 빌더 M1-1·M1-2 — 공급가 「수수료율 자동」 방식 (2026-11-14 마스터 플랜 docs/PLAN_20261114_B2B_MASTER.md §2·§4)
-- 주인님: 「본사가 해당 업체의 판매수수료를 예를 들면 3%로 정하면, 공급사가 리셀러 판매수수료를 10%로 정할 때 최종 공급가가 정해지고」
--        「본사 판매 수수료는 확정이 아니라 본사 관리자에서 공급업체별로 수정할 수 있도록」
-- 공급가 = 판매가 × (1 − 본사 판매수수료율 − 리셀러 판매수수료율), 원 단위 버림. 옵션 추가 공급가도 같은 비율.
-- 옛 방식(공급사가 공급가 직접 입력, 0054·0060)은 지우지 않고 몰 설정 supply_mode = 'manual'(기본값)로 남긴다(마스터 플랜 §3-1).
-- 추가만(drop 없음). 계산은 트리거가 하므로 기존 공급사 저장·승인·옵션 함수는 고치지 않는다.

-- 1. 칸
alter table public.mall_builder_stores add column if not exists supply_mode text not null default 'manual';
alter table public.mall_builder_stores add column if not exists hq_fee_rate numeric(5, 2) not null default 3;
alter table public.mall_builder_suppliers add column if not exists hq_fee_rate numeric(5, 2);
alter table public.mall_builder_product_supply add column if not exists reseller_rate numeric(5, 2) not null default 0;
alter table public.mall_builder_product_supply add column if not exists hq_rate numeric(5, 2);
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_stores_supply_mode_chk') then
    alter table public.mall_builder_stores add constraint mall_builder_stores_supply_mode_chk check (supply_mode in ('manual', 'rate'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_stores_hq_fee_chk') then
    alter table public.mall_builder_stores add constraint mall_builder_stores_hq_fee_chk check (hq_fee_rate >= 0 and hq_fee_rate <= 50);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_suppliers_hq_fee_chk') then
    alter table public.mall_builder_suppliers add constraint mall_builder_suppliers_hq_fee_chk check (hq_fee_rate is null or (hq_fee_rate >= 0 and hq_fee_rate <= 50));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_product_supply_rates_chk') then
    alter table public.mall_builder_product_supply add constraint mall_builder_product_supply_rates_chk
      check (reseller_rate >= 0 and reseller_rate <= 50 and (hq_rate is null or (hq_rate >= 0 and hq_rate <= 50)));
  end if;
end $c$;

-- 2. 코어 계산
-- 공급사의 실제 본사율: 공급사 값 → 없으면 몰 기본값
create or replace function mall_builder_private.supplier_hq_rate(p_supplier uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(s.hq_fee_rate, st.hq_fee_rate, 3)
    from public.mall_builder_suppliers s join public.mall_builder_stores st on st.id = s.store_id
   where s.id = p_supplier
$$;
-- 판매가에서 두 율을 뺀 공급가(원 단위 버림)
create or replace function mall_builder_private.rate_supply(p_price bigint, p_hq numeric, p_reseller numeric)
returns bigint language sql immutable set search_path = '' as $$
  select greatest(0, floor(coalesce(p_price, 0) * (100 - coalesce(p_hq, 0) - coalesce(p_reseller, 0)) / 100.0))::bigint
$$;
revoke all on function mall_builder_private.supplier_hq_rate(uuid) from public, anon, authenticated;
revoke all on function mall_builder_private.rate_supply(bigint, numeric, numeric) from public, anon, authenticated;

-- 3. 자동 계산 트리거
-- 상품 공급가 줄: 수수료율 방식 몰이면 판매가·두 율로 공급가를 다시 계산(공급사가 보낸 공급가는 쓰지 않음)
create or replace function public.mall_builder_product_supply_rate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_mode text; v_price bigint;
begin
  select st.supply_mode into v_mode from public.mall_builder_stores st where st.id = new.store_id;
  if v_mode is distinct from 'rate' then return new; end if;
  select p.base_price into v_price from public.mall_builder_products p where p.id = new.product_id;
  new.hq_rate := mall_builder_private.supplier_hq_rate(new.supplier_id);
  if new.hq_rate + new.reseller_rate > 90 then raise exception '본사 판매수수료(%%%)와 리셀러 수수료(%%%)를 합쳐 90%%를 넘을 수 없습니다.', new.hq_rate, new.reseller_rate; end if;
  new.supply_price := mall_builder_private.rate_supply(v_price, new.hq_rate, new.reseller_rate);
  return new;
end;
$$;
drop trigger if exists mall_builder_product_supply_rate on public.mall_builder_product_supply;
create trigger mall_builder_product_supply_rate before insert or update on public.mall_builder_product_supply
  for each row execute function public.mall_builder_product_supply_rate();

-- 옵션 추가 공급가 줄: 같은 비율로 옵션 추가 판매가에서 계산
create or replace function public.mall_builder_variant_supply_rate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_mode text; v_extra bigint; ps public.mall_builder_product_supply%rowtype;
begin
  select st.supply_mode into v_mode from public.mall_builder_stores st where st.id = new.store_id;
  if v_mode is distinct from 'rate' then return new; end if;
  select v.extra_price into v_extra from public.mall_builder_product_variants v where v.id = new.variant_id;
  select * into ps from public.mall_builder_product_supply s where s.product_id = new.product_id;
  new.extra_supply := mall_builder_private.rate_supply(v_extra, coalesce(ps.hq_rate, mall_builder_private.supplier_hq_rate(new.supplier_id)), coalesce(ps.reseller_rate, 0));
  return new;
end;
$$;
drop trigger if exists mall_builder_variant_supply_rate on public.mall_builder_variant_supply;
create trigger mall_builder_variant_supply_rate before insert or update on public.mall_builder_variant_supply
  for each row execute function public.mall_builder_variant_supply_rate();

-- 판매가·옵션 추가 판매가가 바뀌면 공급가 줄을 다시 계산하게 건드림
create or replace function public.mall_builder_products_rate_touch()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.base_price is distinct from old.base_price
     and exists (select 1 from public.mall_builder_stores st where st.id = new.store_id and st.supply_mode = 'rate') then
    update public.mall_builder_product_supply set updated_at = now() where product_id = new.id;
    update public.mall_builder_variant_supply set updated_at = now() where product_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_products_rate_touch on public.mall_builder_products;
create trigger mall_builder_products_rate_touch after update of base_price on public.mall_builder_products
  for each row execute function public.mall_builder_products_rate_touch();

create or replace function public.mall_builder_variants_rate_touch()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.extra_price is distinct from old.extra_price
     and exists (select 1 from public.mall_builder_stores st where st.id = new.store_id and st.supply_mode = 'rate') then
    update public.mall_builder_variant_supply set updated_at = now() where variant_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_variants_rate_touch on public.mall_builder_product_variants;
create trigger mall_builder_variants_rate_touch after update of extra_price on public.mall_builder_product_variants
  for each row execute function public.mall_builder_variants_rate_touch();

-- 4. 설정 함수
-- 몰 대표: 공급가 방식·몰 기본 본사율. 바꾸면 이 몰 공급사 상품 공급가를 다시 계산
create or replace function public.mall_builder_supply_settings_save(p_store_id uuid, p_mode text, p_hq_rate numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'owner') then raise exception '몰 대표만 바꿀 수 있습니다.'; end if;
  if p_mode not in ('manual', 'rate') then raise exception '공급가 방식을 골라 주세요.'; end if;
  if p_hq_rate is null or p_hq_rate < 0 or p_hq_rate > 50 then raise exception '본사 판매수수료율은 0~50%% 사이로 적어 주세요.'; end if;
  update public.mall_builder_stores set supply_mode = p_mode, hq_fee_rate = round(p_hq_rate, 2), updated_at = now() where id = p_store_id;
  update public.mall_builder_product_supply set updated_at = now() where store_id = p_store_id;
  update public.mall_builder_variant_supply set updated_at = now() where store_id = p_store_id;
  perform mall_builder_private.staff_log(p_store_id, 'supply_settings', 'store', p_store_id::text, p_mode || ' ' || p_hq_rate::text);
end;
$$;

-- 몰 대표: 공급사별 본사율(비우면 몰 기본값). 그 공급사 상품 공급가 다시 계산
create or replace function public.mall_builder_supplier_hq_rate_set(p_supplier_id uuid, p_rate numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.mall_builder_suppliers%rowtype;
begin
  select * into s from public.mall_builder_suppliers x where x.id = p_supplier_id for update;
  if s.id is null or auth.uid() is null or not public.mall_builder_staff_can(s.store_id, 'owner') then raise exception '공급사를 찾을 수 없습니다.'; end if;
  if p_rate is not null and (p_rate < 0 or p_rate > 50) then raise exception '본사 판매수수료율은 0~50%% 사이로 적어 주세요.'; end if;
  update public.mall_builder_suppliers set hq_fee_rate = round(p_rate, 2), updated_at = now() where id = s.id;
  update public.mall_builder_product_supply set updated_at = now() where supplier_id = s.id;
  update public.mall_builder_variant_supply set updated_at = now() where supplier_id = s.id;
  perform mall_builder_private.staff_log(s.store_id, 'supplier_hq_rate', 'supplier', s.id::text, coalesce(p_rate::text, '기본값'));
end;
$$;

-- 공급사 본인(또는 상품 권한 운영자): 상품별 리셀러 판매수수료율. 공급가 다시 계산
create or replace function public.mall_builder_product_reseller_rate_set(p_product_id uuid, p_rate numeric)
returns bigint language plpgsql security definer set search_path = '' as $$
declare ps public.mall_builder_product_supply%rowtype; v_supply bigint;
begin
  select * into ps from public.mall_builder_product_supply s where s.product_id = p_product_id for update;
  if ps.product_id is null or auth.uid() is null
     or not (coalesce(public.mall_builder_my_supplier_id(ps.store_id) = ps.supplier_id, false) or coalesce(public.mall_builder_staff_can(ps.store_id, 'products'), false)) then
    raise exception '공급사 상품을 찾을 수 없습니다.';
  end if;
  if p_rate is null or p_rate < 0 or p_rate > 50 then raise exception '리셀러 판매수수료율은 0~50%% 사이로 적어 주세요.'; end if;
  update public.mall_builder_product_supply set reseller_rate = round(p_rate, 2), updated_at = now() where product_id = p_product_id
    returning supply_price into v_supply;
  update public.mall_builder_variant_supply set updated_at = now() where product_id = p_product_id;
  return v_supply;
end;
$$;

revoke all on function public.mall_builder_supply_settings_save(uuid, text, numeric) from public, anon;
revoke all on function public.mall_builder_supplier_hq_rate_set(uuid, numeric) from public, anon;
revoke all on function public.mall_builder_product_reseller_rate_set(uuid, numeric) from public, anon;
grant execute on function public.mall_builder_supply_settings_save(uuid, text, numeric) to authenticated;
grant execute on function public.mall_builder_supplier_hq_rate_set(uuid, numeric) to authenticated;
grant execute on function public.mall_builder_product_reseller_rate_set(uuid, numeric) to authenticated;
