-- T2 분양몰 0061~0063 묶음 (2026-11-13) — 한 트랜잭션
begin;
-- AI 쇼핑몰 빌더 T2-1 — 분양몰: 몰 종류·분양 신청·승인(분양자 소유 몰 생성)·이용 기간 (2026-11-13)
-- 설계 docs/PLAN_20261113_T2_RESALE_MALL.md. 결정: 결제는 본사 계좌·본사 토스(분양몰 사업자 정보 = 본사 복사, 분양자가 못 바꿈).
-- 추가·함수 추가만(drop 없음). Lab → 로컬 전체 실행 검사 → 운영(승인).

-- ── 몰 칸 ──
alter table public.mall_builder_stores add column if not exists kind text not null default 'standard';
alter table public.mall_builder_stores add column if not exists source_store_id uuid references public.mall_builder_stores (id);
alter table public.mall_builder_stores add column if not exists resale_expires_at timestamptz;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_stores_kind_check') then
    alter table public.mall_builder_stores add constraint mall_builder_stores_kind_check
      check (kind in ('standard', 'resale') and (kind = 'standard') = (source_store_id is null));
  end if;
end $c$;
create index if not exists mall_builder_stores_source on public.mall_builder_stores (source_store_id) where source_store_id is not null;

-- 분양몰은 사업자 정보(입금 계좌·판매자 표시)와 종류·원본·이용 기간을 분양자가 바꿀 수 없다(본사 직원·함수만)
create or replace function public.mall_builder_stores_resale_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.kind is distinct from old.kind or new.source_store_id is distinct from old.source_store_id
       or new.resale_expires_at is distinct from old.resale_expires_at then
      raise exception '분양몰 종류·이용 기간은 본사 「분양」 화면에서만 바꿀 수 있습니다.';
    end if;
    if old.kind = 'resale' and new.business_info is distinct from old.business_info
       and not public.mall_builder_staff_can(old.source_store_id, 'owner') then
      raise exception '분양몰의 사업자·입금 계좌 정보는 본사가 관리합니다.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_stores_resale_guard on public.mall_builder_stores;
create trigger mall_builder_stores_resale_guard before update on public.mall_builder_stores
  for each row execute function public.mall_builder_stores_resale_guard();

-- 이용 기간이 끝났거나 멈춘 분양몰은 새 주문을 받지 않는다(주문 함수는 그대로, 주문 표 앞에서 막음)
create or replace function public.mall_builder_orders_resale_open()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s public.mall_builder_stores%rowtype;
begin
  select * into s from public.mall_builder_stores x where x.id = new.store_id;
  if s.kind = 'resale' and (s.resale_expires_at is null or s.resale_expires_at < now()) then
    raise exception '이 분양몰은 이용 기간이 끝나 지금은 주문할 수 없습니다.';
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_resale_open on public.mall_builder_orders;
create trigger mall_builder_orders_resale_open before insert on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_resale_open();

-- ── 분양 신청 ──
create table if not exists public.mall_builder_resale_applications (
  id uuid primary key default gen_random_uuid(),
  source_store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,29}$' and slug !~ '--' and slug !~ '-$'),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  phone text not null default '' check (char_length(phone) <= 30),
  channel text not null default '' check (char_length(channel) <= 200),
  memo text not null default '' check (char_length(memo) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  note text not null default '' check (char_length(note) <= 300),
  store_id uuid references public.mall_builder_stores (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);
create index if not exists mall_builder_resale_applications_source on public.mall_builder_resale_applications (source_store_id, status, created_at desc);
create unique index if not exists mall_builder_resale_applications_one_pending
  on public.mall_builder_resale_applications (source_store_id, user_id) where status = 'pending';
alter table public.mall_builder_resale_applications enable row level security;
-- 읽기: 신청자 본인, 원본 몰 대표. 쓰기는 함수로만
create policy mall_builder_resale_applications_read on public.mall_builder_resale_applications for select
  using (user_id = (select auth.uid()) or public.mall_builder_staff_can(source_store_id, 'owner'));

-- 분양을 받는 몰 목록(공개 안내 화면): 영업 중이고 「분양 받기」를 켠 일반 몰
create or replace function public.mall_builder_resale_sources()
returns table (id uuid, slug text, name text) language sql stable security definer set search_path = '' as $$
  select s.id, s.slug, s.name from public.mall_builder_stores s
   where s.kind = 'standard' and s.status = 'active' and coalesce((s.modules ->> 'resale')::boolean, false)
   order by s.created_at
$$;

-- 회원: 분양 신청
create or replace function public.mall_builder_resale_apply(p_source_slug text, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_src public.mall_builder_stores%rowtype;
  v_slug text := lower(btrim(coalesce(p ->> 'slug', '')));
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_id uuid;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  select * into v_src from public.mall_builder_stores s where s.slug = lower(btrim(coalesce(p_source_slug, '')));
  if v_src.id is null or v_src.kind <> 'standard' or v_src.status <> 'active' or not coalesce((v_src.modules ->> 'resale')::boolean, false) then
    raise exception '지금은 이 몰의 분양 신청을 받지 않습니다.';
  end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{2,29}$' or v_slug ~ '--' or v_slug ~ '-$' then
    raise exception '몰 주소는 영문 소문자·숫자·하이픈 3~30자로 입력해 주세요.';
  end if;
  if public.mall_builder_is_reserved_slug(v_slug) then raise exception '이 주소는 쓸 수 없습니다: %', v_slug; end if;
  if char_length(v_name) not between 1 and 40 then raise exception '몰 이름은 1~40자로 입력해 주세요.'; end if;
  if exists (select 1 from public.mall_builder_stores s where s.slug = v_slug)
     or exists (select 1 from public.mall_builder_resale_applications a where a.slug = v_slug and a.status = 'pending') then
    raise exception '이미 쓰고 있거나 신청된 몰 주소입니다: %', v_slug;
  end if;
  if exists (select 1 from public.mall_builder_resale_applications a where a.source_store_id = v_src.id and a.user_id = v_uid and a.status = 'pending') then
    raise exception '이미 승인을 기다리는 신청이 있습니다.';
  end if;
  if exists (select 1 from public.mall_builder_stores s where s.source_store_id = v_src.id and s.owner_id = v_uid) then
    raise exception '이미 이 몰의 분양몰을 갖고 있습니다.';
  end if;
  insert into public.mall_builder_resale_applications (source_store_id, user_id, slug, name, phone, channel, memo)
  values (v_src.id, v_uid, v_slug, v_name, left(btrim(coalesce(p ->> 'phone', '')), 30),
          left(btrim(coalesce(p ->> 'channel', '')), 200), left(btrim(coalesce(p ->> 'memo', '')), 500))
  returning id into v_id;
  return v_id;
end;
$$;

-- 회원: 내 신청 취소(승인 전)
create or replace function public.mall_builder_resale_cancel(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.mall_builder_resale_applications set status = 'cancelled', decided_at = now()
   where id = p_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception '취소할 신청을 찾을 수 없습니다.'; end if;
end;
$$;

-- 원본 몰 대표: 승인(분양자 소유 분양몰 생성·이용 기간) / 반려(사유)
create or replace function public.mall_builder_resale_decide(p_id uuid, p_action text, p_days int, p_note text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  a public.mall_builder_resale_applications%rowtype;
  v_src public.mall_builder_stores%rowtype;
  v_store uuid;
  v_note text := left(btrim(coalesce(p_note, '')), 300);
begin
  select * into a from public.mall_builder_resale_applications x where x.id = p_id for update;
  if a.id is null or auth.uid() is null or not public.mall_builder_staff_can(a.source_store_id, 'owner') then raise exception '신청을 찾을 수 없습니다.'; end if;
  if a.status <> 'pending' then raise exception '이미 처리된 신청입니다.'; end if;
  if p_action = 'reject' then
    if v_note = '' then raise exception '반려 사유를 적어 주세요(신청자에게 보입니다).'; end if;
    update public.mall_builder_resale_applications set status = 'rejected', note = v_note, decided_at = now(), decided_by = auth.uid() where id = a.id;
    perform mall_builder_private.staff_log(a.source_store_id, 'resale_reject', 'resale_application', a.id::text, a.slug);
    return 'rejected';
  end if;
  if p_action <> 'approve' then raise exception '알 수 없는 처리입니다.'; end if;
  if p_days is null or p_days not between 1 and 3650 then raise exception '이용 기간(일)을 1~3650 사이로 적어 주세요.'; end if;
  if exists (select 1 from public.mall_builder_stores s where s.slug = a.slug) then raise exception '그 몰 주소는 이미 쓰고 있습니다. 반려 후 다시 신청받아 주세요.'; end if;
  select * into v_src from public.mall_builder_stores s where s.id = a.source_store_id;
  insert into public.mall_builder_stores (owner_id, slug, name, kind, source_store_id, resale_expires_at, business_info, modules)
  values (a.user_id, a.slug, btrim(a.name), 'resale', v_src.id, now() + make_interval(days => p_days), v_src.business_info,
          jsonb_build_object('bank_transfer', true))
  returning id into v_store;
  insert into public.mall_builder_store_staff (store_id, user_id, role) values (v_store, a.user_id, 'owner');
  update public.mall_builder_resale_applications set status = 'approved', note = v_note, store_id = v_store, decided_at = now(), decided_by = auth.uid() where id = a.id;
  perform mall_builder_private.staff_log(a.source_store_id, 'resale_approve', 'resale_application', a.id::text, a.slug);
  return a.slug;
end;
$$;

-- 원본 몰 대표: 이용 기간 바꾸기(오늘부터 N일, 0이면 바로 끝냄)
create or replace function public.mall_builder_resale_set_period(p_store_id uuid, p_days int)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare s public.mall_builder_stores%rowtype; v_until timestamptz;
begin
  select * into s from public.mall_builder_stores x where x.id = p_store_id for update;
  if s.id is null or s.kind <> 'resale' or auth.uid() is null or not public.mall_builder_staff_can(s.source_store_id, 'owner') then raise exception '분양몰을 찾을 수 없습니다.'; end if;
  if p_days is null or p_days not between 0 and 3650 then raise exception '이용 기간(일)을 0~3650 사이로 적어 주세요.'; end if;
  v_until := now() + make_interval(days => p_days);
  update public.mall_builder_stores set resale_expires_at = v_until, updated_at = now() where id = s.id;
  perform mall_builder_private.staff_log(s.source_store_id, 'resale_period', 'store', s.id::text, p_days::text);
  return v_until;
end;
$$;

-- 원본 몰 대표: 분양 받기 켜기/끄기
create or replace function public.mall_builder_resale_set_open(p_store_id uuid, p_open boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'owner') then raise exception '몰을 찾을 수 없습니다.'; end if;
  update public.mall_builder_stores set modules = modules || jsonb_build_object('resale', coalesce(p_open, false)), updated_at = now()
   where id = p_store_id and kind = 'standard';
  if not found then raise exception '분양몰에서는 분양을 받을 수 없습니다.'; end if;
end;
$$;

-- ── 권한 ──
revoke all on function public.mall_builder_stores_resale_guard() from public, anon, authenticated;
revoke all on function public.mall_builder_orders_resale_open() from public, anon, authenticated;
revoke all on function public.mall_builder_resale_apply(text, jsonb) from public, anon;
revoke all on function public.mall_builder_resale_cancel(uuid) from public, anon;
revoke all on function public.mall_builder_resale_decide(uuid, text, int, text) from public, anon;
revoke all on function public.mall_builder_resale_set_period(uuid, int) from public, anon;
revoke all on function public.mall_builder_resale_set_open(uuid, boolean) from public, anon;
grant execute on function public.mall_builder_resale_sources() to anon, authenticated;
grant execute on function public.mall_builder_resale_apply(text, jsonb) to authenticated;
grant execute on function public.mall_builder_resale_cancel(uuid) to authenticated;
grant execute on function public.mall_builder_resale_decide(uuid, text, int, text) to authenticated;
grant execute on function public.mall_builder_resale_set_period(uuid, int) to authenticated;
grant execute on function public.mall_builder_resale_set_open(uuid, boolean) to authenticated;

-- AI 쇼핑몰 빌더 T2-2 — 분양몰 거울 상품: 본사 상품 담기·판매가(본사가 이상)·빼기·원본 변경 자동 반영 (2026-11-13)
-- 설계 docs/PLAN_20261113_T2_RESALE_MALL.md §2. 추가·함수 추가만(drop 없음).

alter table public.mall_builder_products add column if not exists source_product_id uuid references public.mall_builder_products (id) on delete set null;
create unique index if not exists mall_builder_products_one_mirror on public.mall_builder_products (store_id, source_product_id) where source_product_id is not null;
create index if not exists mall_builder_products_source on public.mall_builder_products (source_product_id) where source_product_id is not null;
alter table public.mall_builder_shipping_policies add column if not exists source_policy_id uuid references public.mall_builder_shipping_policies (id) on delete set null;

-- 본사 상품 중 분양몰에 담을 수 있는 것: 승인됨·판매 중/품절·가격 공개·사업자 전용 아님·공급사 입점 중
create or replace function mall_builder_private.resale_source_ok(p public.mall_builder_products)
returns boolean language sql stable security definer set search_path = '' as $$
  select p.approval = 'approved' and p.status in ('on_sale', 'sold_out') and coalesce(p.visibility, 'all') <> 'business_only'
     and coalesce(p.price_visibility, 'all') = 'all' and p.source_product_id is null
     and (p.supplier_id is null or exists (select 1 from public.mall_builder_suppliers x where x.id = p.supplier_id and x.status = 'active'))
$$;

-- 원본 상품의 배송비 정책을 분양몰에 같은 조건으로 복사(한 번만, 원본 정책이 바뀌면 함께 갱신)
create or replace function mall_builder_private.resale_policy_for(p_resale_store uuid, p_source_product public.mall_builder_products)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_src public.mall_builder_shipping_policies%rowtype; v_id uuid;
begin
  select * into v_src from public.mall_builder_shipping_policies sp
   where sp.id = coalesce(p_source_product.shipping_policy_id,
                          (select d.id from public.mall_builder_shipping_policies d where d.store_id = p_source_product.store_id and d.is_default));
  if v_src.id is null then return null; end if;
  select sp.id into v_id from public.mall_builder_shipping_policies sp where sp.store_id = p_resale_store and sp.source_policy_id = v_src.id;
  if v_id is null then
    insert into public.mall_builder_shipping_policies (store_id, name, type, base_fee, free_over, jeju_fee, island_fee, is_default, source_policy_id)
    values (p_resale_store, left(v_src.name, 30), v_src.type, v_src.base_fee, v_src.free_over, v_src.jeju_fee, v_src.island_fee, false, v_src.id)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- 원본 정책이 바뀌면 분양몰 복사본도 같은 조건으로
create or replace function public.mall_builder_policies_resale_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.mall_builder_shipping_policies
     set type = new.type, base_fee = new.base_fee, free_over = new.free_over, jeju_fee = new.jeju_fee, island_fee = new.island_fee
   where source_policy_id = new.id;
  return new;
end;
$$;
drop trigger if exists mall_builder_policies_resale_sync on public.mall_builder_shipping_policies;
create trigger mall_builder_policies_resale_sync after update on public.mall_builder_shipping_policies
  for each row when (old.source_policy_id is null) execute function public.mall_builder_policies_resale_sync();

-- 분양자: 본사 상품 담기. p_markup = 처음 판매가를 본사가보다 몇 % 높게(0~300, 나중에 상품별로 고침). 돌려주는 값 = 새로 담은 수
create or replace function public.mall_builder_resale_add(p_store_id uuid, p_source_ids uuid[], p_markup numeric)
returns int language plpgsql security definer set search_path = '' as $$
declare
  s public.mall_builder_stores%rowtype;
  src public.mall_builder_products%rowtype;
  v_mirror uuid;
  v_n int := 0;
  v_rate numeric := coalesce(p_markup, 0);
begin
  select * into s from public.mall_builder_stores x where x.id = p_store_id;
  if s.id is null or s.kind <> 'resale' or auth.uid() is null or not public.mall_builder_staff_can(s.id, 'products') then raise exception '분양몰을 찾을 수 없습니다.'; end if;
  if v_rate < 0 or v_rate > 300 then raise exception '처음 판매가 인상률은 0~300%% 사이로 적어 주세요.'; end if;
  if coalesce(array_length(p_source_ids, 1), 0) = 0 then raise exception '담을 상품을 골라 주세요.'; end if;
  if coalesce(array_length(p_source_ids, 1), 0) > 200 then raise exception '한 번에 200개까지 담을 수 있습니다.'; end if;
  if (select count(*) from public.mall_builder_products p where p.store_id = s.id) + array_length(p_source_ids, 1) > 2000 then
    raise exception '분양몰 상품은 2,000개까지 담을 수 있습니다.';
  end if;
  for src in select * from public.mall_builder_products p where p.id = any(p_source_ids) and p.store_id = s.source_store_id loop
    continue when not mall_builder_private.resale_source_ok(src);
    continue when exists (select 1 from public.mall_builder_products m where m.store_id = s.id and m.source_product_id = src.id);
    insert into public.mall_builder_products (store_id, name, summary, description, base_price, list_price, tax_type, status, stock_mode, stock,
                                              images, option_groups, shipping_policy_id, moq, order_unit, max_qty, source_product_id)
    values (s.id, src.name, src.summary, src.description, ceil(src.base_price * (100 + v_rate) / 100.0)::bigint, src.list_price, src.tax_type,
            src.status, src.stock_mode, src.stock, src.images, src.option_groups, mall_builder_private.resale_policy_for(s.id, src),
            src.moq, src.order_unit, src.max_qty, src.id)
    returning id into v_mirror;
    insert into public.mall_builder_product_variants (product_id, store_id, key, "values", extra_price, stock, sku, is_active, sort)
    select v_mirror, s.id, v.key, v."values", v.extra_price, v.stock, v.sku, v.is_active, v.sort
      from public.mall_builder_product_variants v where v.product_id = src.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- 분양자: 판매가 정하기(본사 판매가 이상, 상한 없음)
create or replace function public.mall_builder_resale_price(p_product_id uuid, p_price bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.mall_builder_products%rowtype; v_src bigint;
begin
  select * into m from public.mall_builder_products x where x.id = p_product_id for update;
  if m.id is null or m.source_product_id is null or auth.uid() is null or not public.mall_builder_staff_can(m.store_id, 'products') then raise exception '분양 상품을 찾을 수 없습니다.'; end if;
  select p.base_price into v_src from public.mall_builder_products p where p.id = m.source_product_id;
  if p_price is null or p_price < coalesce(v_src, 0) then raise exception '판매가는 본사 판매가(%원) 이상이어야 합니다.', coalesce(v_src, 0); end if;
  if p_price > 1000000000 then raise exception '판매가를 확인해 주세요.'; end if;
  update public.mall_builder_products set base_price = p_price, updated_at = now() where id = m.id;
end;
$$;

-- 분양자: 빼기(주문 기록이 없으면 지우고, 있으면 「준비 중」으로 숨김 — 원본이 바뀌어도 다시 나오지 않음)
create or replace function public.mall_builder_resale_remove(p_product_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare m public.mall_builder_products%rowtype;
begin
  select * into m from public.mall_builder_products x where x.id = p_product_id for update;
  if m.id is null or m.source_product_id is null or auth.uid() is null or not public.mall_builder_staff_can(m.store_id, 'products') then raise exception '분양 상품을 찾을 수 없습니다.'; end if;
  if exists (select 1 from public.mall_builder_order_items i where i.product_id = m.id) then
    update public.mall_builder_products set status = 'draft', updated_at = now() where id = m.id;
    return 'hidden';
  end if;
  delete from public.mall_builder_products where id = m.id;
  return 'deleted';
end;
$$;

-- 원본 상품이 바뀌면 거울 상품에 반영: 내용·사진·옵션 구성·재고, 판매 상태(분양자가 뺀 「준비 중」은 그대로), 판매가가 원본보다 낮아지면 원본가로
create or replace function public.mall_builder_products_resale_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ok boolean;
begin
  if not exists (select 1 from public.mall_builder_products m where m.source_product_id = new.id) then return new; end if;
  v_ok := mall_builder_private.resale_source_ok(new);
  update public.mall_builder_products m
     set name = new.name, summary = new.summary, description = new.description, images = new.images, tax_type = new.tax_type,
         list_price = new.list_price, option_groups = new.option_groups, stock_mode = new.stock_mode, stock = new.stock,
         moq = new.moq, order_unit = new.order_unit, max_qty = new.max_qty,
         status = case when m.status = 'draft' then 'draft' when v_ok then new.status else 'hidden' end,
         base_price = greatest(m.base_price, new.base_price),
         updated_at = now()
   where m.source_product_id = new.id;
  return new;
end;
$$;
drop trigger if exists mall_builder_products_resale_sync on public.mall_builder_products;
create trigger mall_builder_products_resale_sync after update on public.mall_builder_products
  for each row when (old.source_product_id is null) execute function public.mall_builder_products_resale_sync();

-- 원본 옵션 조합이 바뀌면 거울 조합도(같은 열쇠)
create or replace function public.mall_builder_variants_resale_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.mall_builder_product_variants mv using public.mall_builder_products m
     where mv.product_id = m.id and m.source_product_id = old.product_id and mv.key = old.key;
    return old;
  end if;
  insert into public.mall_builder_product_variants (product_id, store_id, key, "values", extra_price, stock, sku, is_active, sort)
  select m.id, m.store_id, new.key, new."values", new.extra_price, new.stock, new.sku, new.is_active, new.sort
    from public.mall_builder_products m where m.source_product_id = new.product_id
  on conflict (product_id, key) do update
    set "values" = excluded."values", extra_price = excluded.extra_price, stock = excluded.stock, sku = excluded.sku,
        is_active = excluded.is_active, sort = excluded.sort;
  return new;
end;
$$;
drop trigger if exists mall_builder_variants_resale_sync on public.mall_builder_product_variants;
create trigger mall_builder_variants_resale_sync after insert or update or delete on public.mall_builder_product_variants
  for each row execute function public.mall_builder_variants_resale_sync();

-- 분양몰 지킴이: 분양몰에는 직접 상품을 올릴 수 없고(거울 상품만), 거울 상품 판매가는 원본가 밑으로 못 내림, 원본 연결은 못 바꿈
create or replace function public.mall_builder_products_resale_guard()
returns trigger language plpgsql set search_path = '' as $$
declare v_kind text; v_src bigint;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  select s.kind into v_kind from public.mall_builder_stores s where s.id = new.store_id;
  if v_kind = 'resale' then
    if tg_op = 'INSERT' then raise exception '분양몰에는 직접 상품을 올릴 수 없습니다. 「분양」 화면에서 본사 상품을 담아 주세요.'; end if;
    if new.source_product_id is distinct from old.source_product_id then raise exception '분양 상품의 원본 연결은 바꿀 수 없습니다.'; end if;
    select p.base_price into v_src from public.mall_builder_products p where p.id = new.source_product_id;
    if new.base_price < coalesce(v_src, 0) then raise exception '판매가는 본사 판매가(%원) 이상이어야 합니다.', coalesce(v_src, 0); end if;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_products_resale_guard on public.mall_builder_products;
create trigger mall_builder_products_resale_guard before insert or update on public.mall_builder_products
  for each row execute function public.mall_builder_products_resale_guard();

-- 분양자 화면: 본사 상품 목록(담을 수 있는 것) — 분양몰 대표·상품 권한 직원만
create or replace function public.mall_builder_resale_catalog(p_store_id uuid, p_q text default null)
returns table (id uuid, name text, base_price bigint, status text, stock_mode text, stock int, image text, option_count int, added boolean)
language plpgsql stable security definer set search_path = '' as $$
declare s public.mall_builder_stores%rowtype;
begin
  select * into s from public.mall_builder_stores x where x.id = p_store_id;
  if s.id is null or s.kind <> 'resale' or auth.uid() is null or not public.mall_builder_staff_can(s.id, 'products') then raise exception '분양몰을 찾을 수 없습니다.'; end if;
  return query
    select p.id, p.name, p.base_price, p.status, p.stock_mode, p.stock, p.images -> 0 ->> 'url',
           (select count(*)::int from public.mall_builder_product_variants v where v.product_id = p.id),
           exists (select 1 from public.mall_builder_products m where m.store_id = s.id and m.source_product_id = p.id)
      from public.mall_builder_products p
     where p.store_id = s.source_store_id and mall_builder_private.resale_source_ok(p)
       and (p_q is null or btrim(p_q) = '' or p.name ilike '%' || btrim(p_q) || '%')
     order by p.updated_at desc
     limit 300;
end;
$$;

revoke all on function mall_builder_private.resale_source_ok(public.mall_builder_products) from public, anon, authenticated;
revoke all on function mall_builder_private.resale_policy_for(uuid, public.mall_builder_products) from public, anon, authenticated;
revoke all on function public.mall_builder_policies_resale_sync() from public, anon, authenticated;
revoke all on function public.mall_builder_products_resale_sync() from public, anon, authenticated;
revoke all on function public.mall_builder_variants_resale_sync() from public, anon, authenticated;
revoke all on function public.mall_builder_products_resale_guard() from public, anon, authenticated;
revoke all on function public.mall_builder_resale_add(uuid, uuid[], numeric) from public, anon;
revoke all on function public.mall_builder_resale_price(uuid, bigint) from public, anon;
revoke all on function public.mall_builder_resale_remove(uuid) from public, anon;
revoke all on function public.mall_builder_resale_catalog(uuid, text) from public, anon;
grant execute on function public.mall_builder_resale_add(uuid, uuid[], numeric) to authenticated;
grant execute on function public.mall_builder_resale_price(uuid, bigint) to authenticated;
grant execute on function public.mall_builder_resale_remove(uuid) to authenticated;
grant execute on function public.mall_builder_resale_catalog(uuid, text) to authenticated;

-- AI 쇼핑몰 빌더 T2-3·T2-4 — 분양몰 주문 전달·상태 연동·분양자 마진 장부·출금 (2026-11-13)
-- 설계 docs/PLAN_20261113_T2_RESALE_MALL.md §3. 돈은 본사 계좌로 들어오므로 분양몰 주문의 「입금 확인」은 본사(원본 몰 주문 권한)만,
-- 준비·발송·배송 완료는 본사 전달 주문을 따라 자동. 추가·함수 추가만(drop 없음).

alter table public.mall_builder_orders add column if not exists forwarded_order_id uuid references public.mall_builder_orders (id);
alter table public.mall_builder_orders add column if not exists resale_order_id uuid references public.mall_builder_orders (id);
create index if not exists mall_builder_orders_resale_order on public.mall_builder_orders (resale_order_id) where resale_order_id is not null;

-- ── 분양자 마진 장부·출금 ──
create table if not exists public.mall_builder_resale_ledger (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade, -- 분양몰
  order_id uuid references public.mall_builder_orders (id) on delete set null,
  payout_id uuid,
  kind text not null check (kind in ('earn', 'reclaim', 'payout', 'refund')),
  amount bigint not null,
  balance_after bigint not null,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_resale_ledger_store on public.mall_builder_resale_ledger (store_id, created_at desc);
create table if not exists public.mall_builder_resale_payouts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade, -- 분양몰
  source_store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  amount bigint not null check (amount > 0),
  bank_name text not null check (char_length(btrim(bank_name)) between 1 and 30),
  bank_account text not null check (char_length(btrim(bank_account)) between 1 and 40),
  bank_holder text not null check (char_length(btrim(bank_holder)) between 1 and 30),
  status text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  memo text not null default '' check (char_length(memo) <= 200),
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists mall_builder_resale_payouts_source on public.mall_builder_resale_payouts (source_store_id, status, requested_at desc);
alter table public.mall_builder_resale_ledger enable row level security;
alter table public.mall_builder_resale_payouts enable row level security;
-- 읽기: 분양몰 대표, 원본 몰 대표. 쓰기는 함수·트리거로만
create policy mall_builder_resale_ledger_read on public.mall_builder_resale_ledger for select
  using (public.mall_builder_staff_can(store_id, 'owner')
         or exists (select 1 from public.mall_builder_stores s where s.id = mall_builder_resale_ledger.store_id and public.mall_builder_staff_can(s.source_store_id, 'owner')));
create policy mall_builder_resale_payouts_read on public.mall_builder_resale_payouts for select
  using (public.mall_builder_staff_can(store_id, 'owner') or public.mall_builder_staff_can(source_store_id, 'owner'));

create or replace function mall_builder_private.resale_ledger_add(p_store uuid, p_order uuid, p_payout uuid, p_kind text, p_amount bigint, p_note text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_bal bigint;
begin
  perform pg_advisory_xact_lock(hashtext('mall_builder_resale_ledger:' || p_store::text));
  select coalesce(sum(l.amount), 0) into v_bal from public.mall_builder_resale_ledger l where l.store_id = p_store;
  insert into public.mall_builder_resale_ledger (store_id, order_id, payout_id, kind, amount, balance_after, note)
  values (p_store, p_order, p_payout, p_kind, p_amount, v_bal + p_amount, left(coalesce(p_note, ''), 200));
  return v_bal + p_amount;
end;
$$;

-- ── 본사 전달 주문 만들기(분양몰 주문이 「결제 완료」가 될 때) ──
create or replace function mall_builder_private.resale_forward(p_order uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  s public.mall_builder_stores%rowtype;
  v_cust uuid;
  v_seq int;
  v_new uuid;
  r record;
  v_sub bigint := 0;
  v_unit bigint;
  v_sv public.mall_builder_product_variants%rowtype;
  v_src public.mall_builder_products%rowtype;
begin
  select * into o from public.mall_builder_orders x where x.id = p_order;
  select * into s from public.mall_builder_stores x where x.id = o.store_id;
  if s.kind <> 'resale' or o.forwarded_order_id is not null then return o.forwarded_order_id; end if;
  select c.id into v_cust from public.mall_builder_store_customers c where c.store_id = s.source_store_id and c.user_id = s.owner_id;
  perform pg_advisory_xact_lock(hashtext('mall_builder_order_seq:' || s.source_store_id::text));
  select coalesce(max(x.seq), 0) + 1 into v_seq from public.mall_builder_orders x where x.store_id = s.source_store_id;
  insert into public.mall_builder_orders (store_id, seq, order_no, user_id, customer_id, status, pay_method, receiver, depositor, bank, memo, resale_order_id)
  values (s.source_store_id, v_seq, to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0'),
          s.owner_id, v_cust, 'paid', 'bank', o.receiver, left('분양 ' || s.name, 20), '{}'::jsonb,
          left('분양몰 ' || s.slug || ' 주문 ' || o.order_no || case when o.memo <> '' then ' · ' || o.memo else '' end, 200), o.id)
  returning id into v_new;
  for r in select i.*, m.source_product_id from public.mall_builder_order_items i join public.mall_builder_products m on m.id = i.product_id
            where i.order_id = o.id and i.qty > i.cancelled_qty loop
    if r.source_product_id is null then raise exception '분양 상품 「%」의 본사 상품을 찾을 수 없습니다.', r.name_snapshot; end if;
    select * into v_src from public.mall_builder_products p where p.id = r.source_product_id for update;
    v_sv := null;
    if r.variant_id is not null then
      select v.* into v_sv from public.mall_builder_product_variants v where v.product_id = v_src.id and v.key = r.option_snapshot for update;
      if v_sv.id is null then raise exception '「% %」 옵션이 본사 상품에서 사라졌습니다.', r.name_snapshot, r.option_snapshot; end if;
    end if;
    v_unit := v_src.base_price + coalesce(v_sv.extra_price, 0);
    insert into public.mall_builder_order_items (order_id, product_id, variant_id, name_snapshot, option_snapshot, image_url, unit_price, qty, line_total, price_breakdown, shipping_policy_id)
    values (v_new, v_src.id, v_sv.id, v_src.name, coalesce(v_sv.key, ''), v_src.images -> 0 ->> 'url', v_unit, r.qty - r.cancelled_qty, v_unit * (r.qty - r.cancelled_qty),
            jsonb_build_array(jsonb_build_object('label', '분양 전달', 'amount', 0)),
            coalesce(v_src.shipping_policy_id, (select d.id from public.mall_builder_shipping_policies d where d.store_id = v_src.store_id and d.is_default)));
    v_sub := v_sub + v_unit * (r.qty - r.cancelled_qty);
    -- 본사 재고 차감(거울 상품 재고는 동기화 트리거가 본사 재고로 다시 맞춤)
    if v_src.stock_mode = 'product' then
      if v_sv.id is not null then
        update public.mall_builder_product_variants set stock = greatest(stock - (r.qty - r.cancelled_qty), 0) where id = v_sv.id;
      else
        update public.mall_builder_products set stock = greatest(stock - (r.qty - r.cancelled_qty), 0) where id = v_src.id;
      end if;
    end if;
  end loop;
  -- 배송비는 분양몰 주문과 같게(공급사 배송비 기록 트리거가 이 저장에서 돈다)
  update public.mall_builder_orders set subtotal = v_sub, shipping_fee = o.shipping_fee, total = v_sub + o.shipping_fee where id = v_new;
  update public.mall_builder_orders set forwarded_order_id = v_new where id = o.id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (v_new, null, 'paid', auth.uid(), 'system', '분양몰 ' || s.slug || ' 주문 ' || o.order_no || ' 전달');
  return v_new;
end;
$$;

-- 본사 재고 되돌리기(전달 주문 취소 때)
create or replace function mall_builder_private.resale_restock(p_hq_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select i.product_id, i.variant_id, i.qty - i.cancelled_qty q, p.stock_mode from public.mall_builder_order_items i
             join public.mall_builder_products p on p.id = i.product_id where i.order_id = p_hq_order and i.qty > i.cancelled_qty loop
    continue when r.stock_mode <> 'product';
    if r.variant_id is not null then update public.mall_builder_product_variants set stock = stock + r.q where id = r.variant_id;
    else update public.mall_builder_products set stock = stock + r.q where id = r.product_id; end if;
  end loop;
end;
$$;

-- 분양몰 주문 마진 = 분양몰 상품 금액 − 본사 전달 상품 금액
create or replace function mall_builder_private.resale_margin(p_order uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce((select sum(i.unit_price * greatest(i.qty - i.cancelled_qty, 0)) from public.mall_builder_order_items i where i.order_id = o.id), 0)
       - coalesce((select sum(i.unit_price * greatest(i.qty - i.cancelled_qty, 0)) from public.mall_builder_order_items i where i.order_id = o.forwarded_order_id), 0)
    from public.mall_builder_orders o where o.id = p_order
$$;

-- 분양몰 주문 상태 지킴이: 로그인한 사람(분양자 포함)은 「결제 완료」·준비·발송을 직접 못 바꿈 — 본사 입금 확인 함수·본사 발송 연동만
-- (관리자 화면의 상태 단추는 권한을 높여 도는 함수라 current_user로는 못 거름 → 연동 표시(mall_builder.resale_sync)로 구분.
--  로그인 없이 도는 자동 작업(자동 배송 완료 등)은 막지 않음)
create or replace function public.mall_builder_orders_resale_guard()
returns trigger language plpgsql set search_path = '' as $$
declare v_kind text;
begin
  if new.status is not distinct from old.status or auth.uid() is null or coalesce(current_setting('mall_builder.resale_sync', true), '') = 'on' then return new; end if;
  select s.kind into v_kind from public.mall_builder_stores s where s.id = new.store_id;
  if v_kind = 'resale' and new.status in ('paid', 'preparing', 'shipping') then
    raise exception '분양몰 주문의 입금 확인·발송 상태는 본사가 처리합니다(본사 「분양」 화면·본사 발송을 따라 자동으로 바뀝니다).';
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_resale_guard on public.mall_builder_orders;
create trigger mall_builder_orders_resale_guard before update of status on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_resale_guard();

-- 상태 연동
create or replace function public.mall_builder_orders_resale_link()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_kind text;
  hq public.mall_builder_orders%rowtype;
  ro public.mall_builder_orders%rowtype;
  v_margin bigint;
  v_earn public.mall_builder_resale_ledger%rowtype;
  rank_of constant jsonb := '{"pending_payment":0,"paid":1,"preparing":2,"shipping":3,"delivered":4,"confirmed":5}';
begin
  if new.status is not distinct from old.status then return new; end if;
  select s.kind into v_kind from public.mall_builder_stores s where s.id = new.store_id;

  -- (가) 분양몰 주문이 바뀜
  if v_kind = 'resale' then
    if new.status = 'paid' and new.forwarded_order_id is null then
      perform mall_builder_private.resale_forward(new.id);
    elsif new.forwarded_order_id is not null then
      select * into hq from public.mall_builder_orders x where x.id = new.forwarded_order_id for update;
      if new.status = 'cancelled' and hq.status in ('pending_payment', 'paid', 'preparing') then
        perform mall_builder_private.resale_restock(hq.id);
        update public.mall_builder_orders set status = 'cancelled', updated_at = now() where id = hq.id;
        insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
        values (hq.id, hq.status, 'cancelled', auth.uid(), 'system', '분양몰 주문 ' || new.order_no || ' 취소');
      elsif new.status = 'confirmed' then
        if hq.status = 'delivered' then
          update public.mall_builder_orders set status = 'confirmed', updated_at = now() where id = hq.id;
          insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
          values (hq.id, 'delivered', 'confirmed', auth.uid(), 'system', '분양몰 주문 ' || new.order_no || ' 구매 확정');
        end if;
        v_margin := mall_builder_private.resale_margin(new.id);
        if v_margin > 0 and not exists (select 1 from public.mall_builder_resale_ledger l where l.order_id = new.id and l.kind = 'earn') then
          perform mall_builder_private.resale_ledger_add(new.store_id, new.id, null, 'earn', v_margin, '주문 ' || new.order_no || ' 구매 확정 마진');
        end if;
      elsif new.status = 'returned' then
        if hq.status in ('delivered', 'confirmed') then
          update public.mall_builder_orders set status = 'returned', updated_at = now() where id = hq.id;
          insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
          values (hq.id, hq.status, 'returned', auth.uid(), 'system', '분양몰 주문 ' || new.order_no || ' 반품');
        end if;
      end if;
    end if;
    -- 확정 뒤 반품·취소면 마진 회수(한 번만)
    if new.status in ('cancelled', 'returned') then
      for v_earn in select * from public.mall_builder_resale_ledger l where l.order_id = new.id and l.kind = 'earn' loop
        if not exists (select 1 from public.mall_builder_resale_ledger l where l.order_id = new.id and l.kind = 'reclaim') then
          perform mall_builder_private.resale_ledger_add(new.store_id, new.id, null, 'reclaim', -v_earn.amount, '주문 ' || new.order_no || ' 반품·취소 — 마진 회수');
        end if;
      end loop;
    end if;
    return new;
  end if;

  -- (나) 본사 전달 주문이 준비·발송·배송 완료로 바뀜 → 분양몰 주문도 따라감(송장 함께)
  if new.resale_order_id is not null and new.status in ('preparing', 'shipping', 'delivered') then
    select * into ro from public.mall_builder_orders x where x.id = new.resale_order_id for update;
    if ro.id is not null and coalesce((rank_of ->> ro.status)::int, 99) < (rank_of ->> new.status)::int then
      perform set_config('mall_builder.resale_sync', 'on', true);
      update public.mall_builder_orders set status = new.status, courier = new.courier, tracking_no = new.tracking_no, updated_at = now() where id = ro.id;
      insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
      values (ro.id, ro.status, new.status, auth.uid(), 'system', '본사 ' || new.order_no || ' 진행을 따라 바뀜');
      perform set_config('mall_builder.resale_sync', '', true);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_resale_link on public.mall_builder_orders;
create trigger mall_builder_orders_resale_link after update of status on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_resale_link();

-- 본사(원본 몰 주문 권한): 분양몰 주문 목록(입금 대기 먼저)
create or replace function public.mall_builder_resale_orders(p_source_store_id uuid)
returns table (id uuid, store_slug text, store_name text, order_no text, status text, total bigint, depositor text, created_at timestamptz, forwarded_order_id uuid, margin bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_source_store_id, 'orders') then raise exception '권한이 없습니다.'; end if;
  return query
    select o.id, s.slug, s.name, o.order_no, o.status, o.total, o.depositor, o.created_at, o.forwarded_order_id, mall_builder_private.resale_margin(o.id)
      from public.mall_builder_orders o join public.mall_builder_stores s on s.id = o.store_id
     where s.source_store_id = p_source_store_id
     order by (o.status = 'pending_payment') desc, o.created_at desc
     limit 200;
end;
$$;

-- 본사: 분양몰 주문 입금 확인(→ 전달 주문 생성)
create or replace function public.mall_builder_resale_confirm_payment(p_order_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare o public.mall_builder_orders%rowtype; s public.mall_builder_stores%rowtype;
begin
  select * into o from public.mall_builder_orders x where x.id = p_order_id for update;
  select * into s from public.mall_builder_stores x where x.id = o.store_id;
  if o.id is null or s.kind <> 'resale' or auth.uid() is null or not public.mall_builder_staff_can(s.source_store_id, 'orders') then raise exception '분양몰 주문을 찾을 수 없습니다.'; end if;
  if o.status <> 'pending_payment' then raise exception '입금 대기 주문만 입금 확인할 수 있습니다.'; end if;
  perform set_config('mall_builder.resale_sync', 'on', true);
  update public.mall_builder_orders set status = 'paid', updated_at = now() where id = o.id;
  perform set_config('mall_builder.resale_sync', '', true);
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (o.id, 'pending_payment', 'paid', auth.uid(), 'staff', '본사 입금 확인');
  return (select x.forwarded_order_id from public.mall_builder_orders x where x.id = o.id);
end;
$$;

-- 분양자: 출금 신청(잔액에서 바로 빠짐)
create or replace function public.mall_builder_resale_payout_request(p_store_id uuid, p_amount bigint, p_bank jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.mall_builder_stores%rowtype; v_bal bigint; v_id uuid;
begin
  select * into s from public.mall_builder_stores x where x.id = p_store_id;
  if s.id is null or s.kind <> 'resale' or auth.uid() is null or not public.mall_builder_staff_can(s.id, 'owner') then raise exception '분양몰을 찾을 수 없습니다.'; end if;
  if p_amount is null or p_amount < 10000 then raise exception '출금은 10,000원부터 신청할 수 있습니다.'; end if;
  perform pg_advisory_xact_lock(hashtext('mall_builder_resale_ledger:' || s.id::text));
  select coalesce(sum(l.amount), 0) into v_bal from public.mall_builder_resale_ledger l where l.store_id = s.id;
  if p_amount > v_bal then raise exception '잔액(%원)보다 많이 신청할 수 없습니다.', v_bal; end if;
  if exists (select 1 from public.mall_builder_resale_payouts p where p.store_id = s.id and p.status = 'requested') then raise exception '처리 중인 출금 신청이 있습니다.'; end if;
  insert into public.mall_builder_resale_payouts (store_id, source_store_id, amount, bank_name, bank_account, bank_holder)
  values (s.id, s.source_store_id, p_amount, btrim(coalesce(p_bank ->> 'bank_name', '')), btrim(coalesce(p_bank ->> 'bank_account', '')), btrim(coalesce(p_bank ->> 'bank_holder', '')))
  returning id into v_id;
  perform mall_builder_private.resale_ledger_add(s.id, null, v_id, 'payout', -p_amount, '출금 신청');
  return v_id;
end;
$$;

-- 본사: 출금 지급 완료 / 반려(잔액 돌려줌)
create or replace function public.mall_builder_resale_payout_decide(p_id uuid, p_action text, p_memo text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.mall_builder_resale_payouts%rowtype;
begin
  select * into p from public.mall_builder_resale_payouts x where x.id = p_id for update;
  if p.id is null or auth.uid() is null or not public.mall_builder_staff_can(p.source_store_id, 'owner') then raise exception '출금 신청을 찾을 수 없습니다.'; end if;
  if p.status <> 'requested' then raise exception '이미 처리된 출금 신청입니다.'; end if;
  if p_action = 'paid' then
    update public.mall_builder_resale_payouts set status = 'paid', memo = left(btrim(coalesce(p_memo, '')), 200), decided_at = now() where id = p.id;
  elsif p_action = 'reject' then
    if btrim(coalesce(p_memo, '')) = '' then raise exception '반려 사유를 적어 주세요.'; end if;
    update public.mall_builder_resale_payouts set status = 'rejected', memo = left(btrim(p_memo), 200), decided_at = now() where id = p.id;
    perform mall_builder_private.resale_ledger_add(p.store_id, null, p.id, 'refund', p.amount, '출금 반려 — 잔액으로 돌려줌');
  else
    raise exception '알 수 없는 처리입니다.';
  end if;
  perform mall_builder_private.staff_log(p.source_store_id, 'resale_payout_' || p_action, 'resale_payout', p.id::text, p.amount::text);
end;
$$;

revoke all on function mall_builder_private.resale_ledger_add(uuid, uuid, uuid, text, bigint, text) from public, anon, authenticated;
revoke all on function mall_builder_private.resale_forward(uuid) from public, anon, authenticated;
revoke all on function mall_builder_private.resale_restock(uuid) from public, anon, authenticated;
revoke all on function mall_builder_private.resale_margin(uuid) from public, anon, authenticated;
revoke all on function public.mall_builder_orders_resale_guard() from public, anon, authenticated;
revoke all on function public.mall_builder_orders_resale_link() from public, anon, authenticated;
revoke all on function public.mall_builder_resale_orders(uuid) from public, anon;
revoke all on function public.mall_builder_resale_confirm_payment(uuid) from public, anon;
revoke all on function public.mall_builder_resale_payout_request(uuid, bigint, jsonb) from public, anon;
revoke all on function public.mall_builder_resale_payout_decide(uuid, text, text) from public, anon;
grant execute on function public.mall_builder_resale_orders(uuid) to authenticated;
grant execute on function public.mall_builder_resale_confirm_payment(uuid) to authenticated;
grant execute on function public.mall_builder_resale_payout_request(uuid, bigint, jsonb) to authenticated;
grant execute on function public.mall_builder_resale_payout_decide(uuid, text, text) to authenticated;

commit;
