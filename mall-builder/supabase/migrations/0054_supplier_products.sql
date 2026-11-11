-- AI 쇼핑몰 빌더 D35 — 입점형 마켓플레이스 2단계: 공급사 상품 등록·운영자 승인
-- 플랜 docs/PLAN_20261111_MARKETPLACE.md. AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만. 추가만(drop 없음 — 확인 창 방지).
-- 규칙: 공급사는 함수로만 자기 상품을 올리고 고친다(재고만 바꾸면 재승인 없음, 그 밖은 다시 승인 대기).
--       운영자(상품 권한)가 판매가를 정해 승인/반려. 손님에게는 승인됐고 공급사가 입점 중인 상품만 보인다.

-- ── 0054a 칸 ──
alter table public.mall_builder_products add column if not exists supplier_id uuid references public.mall_builder_suppliers (id);
alter table public.mall_builder_products add column if not exists supply_price bigint check (supply_price is null or supply_price >= 0);
alter table public.mall_builder_products add column if not exists approval text not null default 'approved' check (approval in ('approved', 'pending', 'rejected'));
alter table public.mall_builder_products add column if not exists approval_note text not null default '' check (char_length(approval_note) <= 300);
alter table public.mall_builder_products add column if not exists approval_at timestamptz;
create index if not exists mall_builder_products_supplier on public.mall_builder_products (supplier_id) where supplier_id is not null;
create index if not exists mall_builder_products_pending on public.mall_builder_products (store_id) where approval = 'pending';

-- ── 0054b 손님 노출: 승인됨 + (자체 상품이거나 공급사 입점 중) ──
create or replace function public.mall_builder_product_visible(p_product_id uuid)
returns boolean language sql stable security definer set search_path to '' as $function$
  select exists (
    select 1 from public.mall_builder_products p join public.mall_builder_stores s on s.id = p.store_id
    where p.id = p_product_id and p.status in ('on_sale', 'sold_out') and s.status = 'active'
      and (p.visibility <> 'business_only' or public.mall_builder_shop_viewer(p.store_id) = 'business')
      and public.mall_builder_closed_ok(p.store_id)
      and p.approval = 'approved'
      and (p.supplier_id is null or exists (select 1 from public.mall_builder_suppliers x where x.id = p.supplier_id and x.status = 'active'))
  );
$function$;

-- 공급사 본인: 자기 상품 읽기(입점 중·쉬는 중 모두)
create policy mall_builder_products_supplier_read on public.mall_builder_products for select
  using (supplier_id is not null and exists (
    select 1 from public.mall_builder_suppliers x where x.id = mall_builder_products.supplier_id and x.user_id = (select auth.uid())));

-- 공급사·승인 칸은 함수로만 바꾼다(운영자 화면 직접 수정도 막음)
create or replace function public.mall_builder_products_supplier_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.supplier_id is not null or new.supply_price is not null or new.approval <> 'approved' then
        raise exception '공급사 상품은 공급사 화면에서만 올릴 수 있습니다.';
      end if;
    elsif new.supplier_id is distinct from old.supplier_id or new.supply_price is distinct from old.supply_price
       or new.approval is distinct from old.approval or new.approval_note is distinct from old.approval_note then
      raise exception '공급사·공급가·승인 상태는 승인 화면에서만 바꿀 수 있습니다.';
    end if;
  end if;
  return new;
end;
$$;
create trigger mall_builder_products_supplier_guard before insert or update on public.mall_builder_products
  for each row execute function public.mall_builder_products_supplier_guard();

-- 공급사 사진: 공개 저장소 <몰 id>/supplier/<공급사 id>/ 아래만, 입점 중인 본인만
create policy mall_builder_public_supplier_insert on storage.objects for insert
  with check (bucket_id = 'mall-builder-public' and (storage.foldername(name))[2] = 'supplier'
    and exists (select 1 from public.mall_builder_suppliers x
                 where x.id::text = (storage.foldername(name))[3] and x.store_id::text = (storage.foldername(name))[1]
                   and x.user_id = (select auth.uid()) and x.status = 'active'));

-- ── 0054c 공급사 함수 ──
-- 사진 목록 검사: 배열 5장 이하, 각 항목 path가 내 폴더 아래
create or replace function mall_builder_private.supplier_images_ok(p_images jsonb, p_prefix text)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(coalesce(p_images, '[]'::jsonb)) = 'array' and jsonb_array_length(coalesce(p_images, '[]'::jsonb)) <= 5
     and not exists (select 1 from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) e
                      where jsonb_typeof(e) <> 'object' or left(coalesce(e ->> 'path', ''), char_length(p_prefix)) <> p_prefix
                         or coalesce(e ->> 'url', '') !~ '^https?://')
$$;

-- 공급사: 상품 올리기(p_product_id null) / 고치기. p = {name, summary, description, supply_price, base_price(처음 등록 때 희망 판매가), tax_type, stock_mode, stock, images}
create or replace function public.mall_builder_supplier_product_save(p_store_id uuid, p_product_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sid uuid := public.mall_builder_my_supplier_id(p_store_id);
  v_old public.mall_builder_products%rowtype;
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
    insert into public.mall_builder_products (store_id, name, summary, description, base_price, tax_type, status, stock_mode, stock, images, supplier_id, supply_price, approval, approval_note)
    values (p_store_id, v_name, v_summary, v_desc, v_base, v_tax, 'draft', v_mode, v_stock, v_images, v_sid, v_supply, 'pending', '')
    returning id into v_id;
    return v_id;
  end if;

  select * into v_old from public.mall_builder_products x where x.id = p_product_id and x.store_id = p_store_id for update;
  if v_old.id is null or v_old.supplier_id is distinct from v_sid then raise exception '내 상품을 찾을 수 없습니다.'; end if;
  v_only_stock := v_old.name = v_name and v_old.summary = v_summary and v_old.description = v_desc and v_old.supply_price = v_supply
              and v_old.tax_type = v_tax and v_old.images = v_images;
  update public.mall_builder_products
     set name = v_name, summary = v_summary, description = v_desc, supply_price = v_supply, tax_type = v_tax,
         stock_mode = v_mode, stock = v_stock, images = v_images, updated_at = now(),
         -- 재고만 바뀌면 그대로, 내용이 바뀌면 다시 승인 대기(판매 중이었으면 승인 전까지 손님에게 안 보임)
         approval = case when v_only_stock then approval else 'pending' end,
         approval_note = case when v_only_stock then approval_note else '' end
   where id = v_old.id;
  return v_old.id;
end;
$$;

-- 공급사: 내 상품 판매 멈춤/다시 열기(멈춤은 바로 숨김, 다시 열기는 승인된 상품만 판매 중으로)
create or replace function public.mall_builder_supplier_product_pause(p_product_id uuid, p_pause boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.mall_builder_products%rowtype;
begin
  select * into v from public.mall_builder_products x where x.id = p_product_id for update;
  if v.id is null or auth.uid() is null or v.supplier_id is distinct from public.mall_builder_my_supplier_id(v.store_id) then raise exception '내 상품을 찾을 수 없습니다.'; end if;
  if p_pause then
    update public.mall_builder_products set status = 'hidden', updated_at = now() where id = v.id;
  else
    if v.approval <> 'approved' then raise exception '승인된 상품만 다시 열 수 있습니다. 운영자 승인을 기다려 주세요.'; end if;
    update public.mall_builder_products set status = 'on_sale', updated_at = now() where id = v.id;
  end if;
end;
$$;

-- ── 0054d 운영자: 승인(판매가 정하기·바로 판매)/반려(사유) ──
create or replace function public.mall_builder_product_review(p_product_id uuid, p_action text, p_note text, p_base_price bigint, p_on_sale boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.mall_builder_products%rowtype; v_note text := left(btrim(coalesce(p_note, '')), 300);
begin
  select * into v from public.mall_builder_products x where x.id = p_product_id for update;
  if v.id is null or auth.uid() is null or not public.mall_builder_staff_can(v.store_id, 'products') then raise exception '상품을 찾을 수 없습니다.'; end if;
  if v.supplier_id is null then raise exception '공급사 상품만 승인 처리합니다.'; end if;
  if p_action = 'approve' then
    if p_base_price is null or p_base_price < coalesce(v.supply_price, 0) then raise exception '판매가는 공급가(%원) 이상이어야 합니다.', coalesce(v.supply_price, 0); end if;
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

-- ── 0054e 권한(별도 마이그레이션 0054_supplier_products_grants로 적용) ──
revoke all on function public.mall_builder_supplier_product_save(uuid, uuid, jsonb) from public, anon;
revoke all on function public.mall_builder_supplier_product_pause(uuid, boolean) from public, anon;
revoke all on function public.mall_builder_product_review(uuid, text, text, bigint, boolean) from public, anon;
grant execute on function public.mall_builder_supplier_product_save(uuid, uuid, jsonb) to authenticated;
grant execute on function public.mall_builder_supplier_product_pause(uuid, boolean) to authenticated;
grant execute on function public.mall_builder_product_review(uuid, text, text, bigint, boolean) to authenticated;
revoke all on function mall_builder_private.supplier_images_ok(jsonb, text) from public, anon, authenticated;
revoke all on function public.mall_builder_products_supplier_guard() from public, anon, authenticated;
