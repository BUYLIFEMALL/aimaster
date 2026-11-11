-- AI 쇼핑몰 빌더 F09 — 장바구니(금액은 저장하지 않음: 보여 줄 때마다 src/lib/pricing.ts로 계산)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(확인 창 방지)
-- 설계(ARCHITECTURE §3-3)의 carts/cart_items 두 표 대신 한 표 — 몰·손님은 줄마다 칸으로 둔다(장바구니 머리 정보가 따로 필요 없음)

create table if not exists public.mall_builder_cart_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  variant_id uuid references public.mall_builder_product_variants (id) on delete cascade,
  qty integer not null check (qty between 1 and 999),
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_cart_items_owner on public.mall_builder_cart_items (store_id, user_id);
-- 같은 상품·같은 옵션은 한 줄(담을 때 수량을 더한다)
create unique index if not exists mall_builder_cart_items_one_line
  on public.mall_builder_cart_items (store_id, user_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 상품은 같은 몰 것만, 옵션 조합은 그 상품 것만, 몰·계정·상품은 못 바꾼다
create or replace function public.mall_builder_cart_items_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.store_id <> old.store_id or new.user_id <> old.user_id or new.product_id <> old.product_id
      or new.variant_id is distinct from old.variant_id) then
    raise exception '장바구니 줄의 상품은 바꿀 수 없습니다. 지우고 다시 담아 주세요.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.mall_builder_products p where p.id = new.product_id and p.store_id = new.store_id) then
    raise exception '이 몰의 상품이 아닙니다.' using errcode = '22023';
  end if;
  if new.variant_id is not null and not exists (
    select 1 from public.mall_builder_product_variants v where v.id = new.variant_id and v.product_id = new.product_id
  ) then
    raise exception '이 상품의 옵션이 아닙니다.' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger mall_builder_cart_items_guard before insert or update on public.mall_builder_cart_items
  for each row execute function public.mall_builder_cart_items_guard();

alter table public.mall_builder_cart_items enable row level security;
-- 장바구니는 손님 본인만(운영자도 못 봄). 담기는 그 몰에 가입한 손님만
create policy "mall_builder_cart_items_own" on public.mall_builder_cart_items
  for all using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.mall_builder_store_customers c where c.store_id = mall_builder_cart_items.store_id and c.user_id = (select auth.uid()))
  );
