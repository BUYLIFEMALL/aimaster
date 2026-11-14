-- AI 쇼핑몰 빌더 P1 — 분양 정산을 「수수료율 방식」으로 (2026-11-14 주인님 「수수료율 방식으로 하고」)
-- 설계 docs/PLAN_20261114_MALL_TYPES_ALIGN.md §2. 정의 docs/MALL_TYPES_DEFINITION.md §2:
--   결제는 본사 하나, 분양몰은 본사 판매가 그대로 판매, 본사가 판매액의 수수료율만큼 분양자에게 지급.
-- 코어 공유(개발 원칙 2): 수수료 계산식 하나(commission_of)를 리셀러(D33) 적립과 분양 정산이 같이 쓴다.
-- 추가·함수 일부 바꾸기만(drop 없음). 바꾸는 함수: 리셀러 적립(0052)·분양 담기·동기화(0062)·분양 판매가(0062)·분양 정산(0063)·분양몰 지킴이(0061).

-- 1. 수수료율: 본사(standard) 몰 = 분양몰 기본값, 분양몰 = 본사가 따로 정한 값(비우면 본사 기본값)
alter table public.mall_builder_stores add column if not exists resale_commission_rate numeric(5, 2);
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_stores_resale_commission_chk') then
    alter table public.mall_builder_stores add constraint mall_builder_stores_resale_commission_chk
      check (resale_commission_rate is null or (resale_commission_rate >= 0 and resale_commission_rate <= 50));
  end if;
end $c$;
update public.mall_builder_stores set resale_commission_rate = 10 where kind = 'standard' and resale_commission_rate is null;

-- 2. 코어: 수수료 = (결제 금액 − 배송비) × 수수료율, 원 단위 버림
create or replace function mall_builder_private.commission_of(p_total bigint, p_shipping bigint, p_rate numeric)
returns bigint language sql immutable set search_path = '' as $$
  select floor(greatest(0, coalesce(p_total, 0) - coalesce(p_shipping, 0)) * greatest(coalesce(p_rate, 0), 0) / 100.0)::bigint
$$;
revoke all on function mall_builder_private.commission_of(bigint, bigint, numeric) from public, anon, authenticated;

-- 분양몰의 실제 수수료율(분양몰 값 → 없으면 본사 기본값 → 없으면 10%)
create or replace function mall_builder_private.resale_rate(p_store uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(s.resale_commission_rate, hq.resale_commission_rate, 10)
    from public.mall_builder_stores s left join public.mall_builder_stores hq on hq.id = s.source_store_id
   where s.id = p_store
$$;
revoke all on function mall_builder_private.resale_rate(uuid) from public, anon, authenticated;

create or replace function pg_temp.swap(src text, a text, b text, what text) returns text language plpgsql as $f$
begin
  if (char_length(src) - char_length(replace(src, a, ''))) / char_length(a) <> 1 then raise exception '문구를 1번 찾지 못함: %', what; end if;
  return replace(src, a, b);
end $f$;

do $m$
declare src text;
begin
  -- 리셀러 적립: 같은 계산식을 코어 함수로
  src := pg_get_functiondef('public.mall_builder_orders_reseller()'::regprocedure);
  src := pg_temp.swap(src, 'v_amt := floor(greatest(0, new.total - new.shipping_fee) * r.rate / 100.0)::bigint;',
                           'v_amt := mall_builder_private.commission_of(new.total, new.shipping_fee, r.rate);', '리셀러 적립');
  execute src;

  -- 분양 담기: 판매가 = 본사 판매가(인상률 무시 — 화면에서도 뺌)
  src := pg_get_functiondef('public.mall_builder_resale_add(uuid,uuid[],numeric)'::regprocedure);
  src := pg_temp.swap(src, 'ceil(src.base_price * (100 + v_rate) / 100.0)::bigint', 'src.base_price', '분양 담기');
  execute src;

  -- 원본 변경 동기화: 판매가도 본사 판매가를 그대로 따라감
  src := pg_get_functiondef('public.mall_builder_products_resale_sync()'::regprocedure);
  src := pg_temp.swap(src, 'base_price = greatest(m.base_price, new.base_price),', 'base_price = new.base_price,', '분양 동기화');
  execute src;

  -- 정산 장부 문구: 마진 → 수수료
  src := pg_get_functiondef('public.mall_builder_orders_resale_link()'::regprocedure);
  src := pg_temp.swap(src, '구매 확정 마진', '구매 확정 수수료', '적립 문구');
  src := pg_temp.swap(src, '반품·취소 — 마진 회수', '반품·취소 — 수수료 회수', '회수 문구');
  execute src;

  -- 분양몰 지킴이: 수수료율도 분양자가 직접 못 바꿈(본사 함수만)
  src := pg_get_functiondef('public.mall_builder_stores_resale_guard()'::regprocedure);
  src := pg_temp.swap(src, 'or new.resale_expires_at is distinct from old.resale_expires_at then',
                           'or new.resale_expires_at is distinct from old.resale_expires_at
       or new.resale_commission_rate is distinct from old.resale_commission_rate then', '지킴이');
  src := pg_temp.swap(src, '분양몰 종류·이용 기간은 본사', '분양몰 종류·이용 기간·수수료율은 본사', '지킴이 문구');
  execute src;
end $m$;

-- 3. 분양 정산 = 수수료(이름은 그대로 두어 부르는 곳을 바꾸지 않음)
create or replace function mall_builder_private.resale_margin(p_order uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select mall_builder_private.commission_of(o.total, o.shipping_fee, mall_builder_private.resale_rate(o.store_id))
    from public.mall_builder_orders o where o.id = p_order
$$;

-- 4. 분양자 판매가 바꾸기는 막음(본사 판매가로 판매)
create or replace function public.mall_builder_resale_price(p_product_id uuid, p_price bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise exception '분양몰은 본사 판매가로 판매합니다. 판매가는 바꿀 수 없고, 판매 금액의 수수료가 정산됩니다.';
end;
$$;

-- 이미 담긴 거울 상품 판매가를 본사 판매가로 맞춤
update public.mall_builder_products m set base_price = p.base_price, updated_at = now()
  from public.mall_builder_products p
 where m.source_product_id = p.id and m.base_price <> p.base_price;

-- 5. 수수료율 읽기(분양몰·본사 직원) / 바꾸기(본사 대표)
create or replace function public.mall_builder_resale_rate_of(p_store_id uuid)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare s public.mall_builder_stores%rowtype;
begin
  select * into s from public.mall_builder_stores x where x.id = p_store_id;
  if s.id is null or auth.uid() is null then return null; end if;
  if not public.mall_builder_staff_can(s.id, 'products')
     and not (s.source_store_id is not null and public.mall_builder_staff_can(s.source_store_id, 'owner')) then return null; end if;
  return case when s.kind = 'resale' then mall_builder_private.resale_rate(s.id) else coalesce(s.resale_commission_rate, 10) end;
end;
$$;

-- p_store_id = 본사 몰이면 기본 수수료율, 분양몰이면 그 몰 수수료율(p_rate 비우면 본사 기본값 따름)
create or replace function public.mall_builder_resale_set_rate(p_store_id uuid, p_rate numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.mall_builder_stores%rowtype; v_hq uuid;
begin
  select * into s from public.mall_builder_stores x where x.id = p_store_id for update;
  v_hq := case when s.kind = 'resale' then s.source_store_id else s.id end;
  if s.id is null or auth.uid() is null or not public.mall_builder_staff_can(v_hq, 'owner') then raise exception '몰을 찾을 수 없습니다.'; end if;
  if s.kind <> 'resale' and p_rate is null then raise exception '기본 수수료율을 적어 주세요.'; end if;
  if p_rate is not null and (p_rate < 0 or p_rate > 50) then raise exception '수수료율은 0~50%% 사이로 적어 주세요.'; end if;
  update public.mall_builder_stores set resale_commission_rate = round(p_rate, 2), updated_at = now() where id = s.id;
  perform mall_builder_private.staff_log(v_hq, 'resale_rate', 'store', s.id::text, coalesce(p_rate::text, '기본값'));
end;
$$;

revoke all on function public.mall_builder_resale_rate_of(uuid) from public, anon;
revoke all on function public.mall_builder_resale_set_rate(uuid, numeric) from public, anon;
grant execute on function public.mall_builder_resale_rate_of(uuid) to authenticated;
grant execute on function public.mall_builder_resale_set_rate(uuid, numeric) to authenticated;
