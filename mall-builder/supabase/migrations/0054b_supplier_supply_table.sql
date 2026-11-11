-- AI 쇼핑몰 빌더 D35 보완 — 공급가를 상품 표 칸이 아니라 별도 표로(손님이 API로 공급가를 읽지 못하게)
-- 이유: 상품 표는 손님도 행을 읽을 수 있어(보안 규칙은 칸을 숨기지 못함) 공급가 칸이 손님에게 노출된다. 원가(product_private)와 같은 방식으로 분리.
-- products.supply_price 칸(0054)은 쓰지 않는다(모두 null) — 지우기는 확인 창 승인이 필요해 다음 묶음 때 처리.
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만. 추가만.

create table if not exists public.mall_builder_product_supply (
  product_id uuid primary key references public.mall_builder_products (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  supplier_id uuid not null references public.mall_builder_suppliers (id),
  supply_price bigint not null check (supply_price >= 0 and supply_price <= 1000000000),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_product_supply_supplier on public.mall_builder_product_supply (supplier_id);
alter table public.mall_builder_product_supply enable row level security;
-- 읽기: 상품 권한 운영자, 공급사 본인. 쓰기 규칙 없음(함수로만)
create policy mall_builder_product_supply_read on public.mall_builder_product_supply for select
  using (public.mall_builder_staff_can(store_id, 'products')
         or exists (select 1 from public.mall_builder_suppliers x where x.id = mall_builder_product_supply.supplier_id and x.user_id = (select auth.uid())));

create or replace function public.mall_builder_supplier_product_save(p_store_id uuid, p_product_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sid uuid := public.mall_builder_my_supplier_id(p_store_id);
  v_old public.mall_builder_products%rowtype;
  v_old_supply bigint;
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_summary text := left(btrim(coalesce(p ->> 'summary', '')), 200);
  v_desc text := left(coalesce(p ->> 'description', ''), 20000);
  v_supply bigint;
  v_base bigint;
  v_tax text := coalesce(nullif(p ->> 'tax_type', ''), 'taxable');
  v_mode text := coalesce(nullif(p ->> 'stock_mode', ''), 'none');
  v_stock int;
  v_images jsonb := coalesce(p -> 'images', '[]'::jsonb);
  v_id uuid;
  v_only_stock boolean;
begin
  if auth.uid() is null or v_sid is null then raise exception '입점 중인 공급사만 상품을 올릴 수 있습니다.'; end if;
  if char_length(v_name) not between 1 and 100 then raise exception '상품 이름을 1~100자로 적어 주세요.'; end if;
  begin
    v_supply := (p ->> 'supply_price')::bigint;
    v_base := nullif(p ->> 'base_price', '')::bigint;
    v_stock := coalesce(nullif(p ->> 'stock', '')::int, 0);
  exception when others then raise exception '공급가·판매가·재고는 숫자로 적어 주세요.';
  end;
  if v_supply is null or v_supply < 0 or v_supply > 1000000000 then raise exception '공급가를 0원 이상으로 적어 주세요.'; end if;
  if v_tax not in ('taxable', 'exempt') then raise exception '과세 구분을 확인해 주세요.'; end if;
  if v_mode not in ('none', 'product') then raise exception '재고 관리 방식을 확인해 주세요.'; end if;
  if v_stock < 0 or v_stock > 1000000 then raise exception '재고를 0 이상으로 적어 주세요.'; end if;
  if not mall_builder_private.supplier_images_ok(v_images, p_store_id::text || '/supplier/' || v_sid::text || '/') then
    raise exception '사진은 공급사 화면에서 올린 것만, 5장까지 쓸 수 있습니다.';
  end if;

  if p_product_id is null then
    if v_base is null or v_base < v_supply then raise exception '희망 판매가는 공급가 이상으로 적어 주세요.'; end if;
    if (select count(*) from public.mall_builder_products x where x.supplier_id = v_sid) >= 500 then raise exception '공급사 한 곳당 상품은 500개까지 올릴 수 있습니다.'; end if;
    insert into public.mall_builder_products (store_id, name, summary, description, base_price, tax_type, status, stock_mode, stock, images, supplier_id, approval, approval_note)
    values (p_store_id, v_name, v_summary, v_desc, v_base, v_tax, 'draft', v_mode, v_stock, v_images, v_sid, 'pending', '')
    returning id into v_id;
    insert into public.mall_builder_product_supply (product_id, store_id, supplier_id, supply_price) values (v_id, p_store_id, v_sid, v_supply);
    return v_id;
  end if;

  select * into v_old from public.mall_builder_products x where x.id = p_product_id and x.store_id = p_store_id for update;
  if v_old.id is null or v_old.supplier_id is distinct from v_sid then raise exception '내 상품을 찾을 수 없습니다.'; end if;
  select s.supply_price into v_old_supply from public.mall_builder_product_supply s where s.product_id = v_old.id;
  v_only_stock := v_old.name = v_name and v_old.summary = v_summary and v_old.description = v_desc and v_old_supply is not distinct from v_supply
              and v_old.tax_type = v_tax and v_old.images = v_images;
  update public.mall_builder_products
     set name = v_name, summary = v_summary, description = v_desc, tax_type = v_tax,
         stock_mode = v_mode, stock = v_stock, images = v_images, updated_at = now(),
         -- 재고만 바뀌면 그대로, 내용이 바뀌면 다시 승인 대기(판매 중이었으면 승인 전까지 손님에게 안 보임)
         approval = case when v_only_stock then approval else 'pending' end,
         approval_note = case when v_only_stock then approval_note else '' end
   where id = v_old.id;
  insert into public.mall_builder_product_supply (product_id, store_id, supplier_id, supply_price) values (v_old.id, p_store_id, v_sid, v_supply)
  on conflict (product_id) do update set supply_price = excluded.supply_price, updated_at = now();
  return v_old.id;
end;
$$;

create or replace function public.mall_builder_product_review(p_product_id uuid, p_action text, p_note text, p_base_price bigint, p_on_sale boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.mall_builder_products%rowtype;
  v_supply bigint;
  v_note text := left(btrim(coalesce(p_note, '')), 300);
begin
  select * into v from public.mall_builder_products x where x.id = p_product_id for update;
  if v.id is null or auth.uid() is null or not public.mall_builder_staff_can(v.store_id, 'products') then raise exception '상품을 찾을 수 없습니다.'; end if;
  if v.supplier_id is null then raise exception '공급사 상품만 승인 처리합니다.'; end if;
  select s.supply_price into v_supply from public.mall_builder_product_supply s where s.product_id = v.id;
  if p_action = 'approve' then
    if p_base_price is null or p_base_price < coalesce(v_supply, 0) then raise exception '판매가는 공급가(%원) 이상이어야 합니다.', coalesce(v_supply, 0); end if;
    update public.mall_builder_products
       set approval = 'approved', approval_note = v_note, approval_at = now(), base_price = p_base_price,
           status = case when p_on_sale then 'on_sale' else status end, updated_at = now()
     where id = v.id;
  elsif p_action = 'reject' then
    if v_note = '' then raise exception '반려 사유를 적어 주세요(공급사에게 보입니다).'; end if;
    update public.mall_builder_products
       set approval = 'rejected', approval_note = v_note, approval_at = now(), status = case when status = 'hidden' then status else 'draft' end, updated_at = now()
     where id = v.id;
  else
    raise exception '알 수 없는 처리입니다.';
  end if;
  perform mall_builder_private.staff_log(v.store_id, 'product_' || p_action, 'product', v.id::text, left(v.name, 100));
end;
$$;
