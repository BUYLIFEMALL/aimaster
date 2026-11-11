-- AI 쇼핑몰 빌더 F04 — 상품 기본(가격·상태·재고·사진·카테고리)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 설계: docs/mall/ARCHITECTURE.md §3-2
-- 원가처럼 손님에게 보이면 안 되는 값은 운영자 전용 표(mall_builder_product_private)에 따로 둔다.

create table if not exists public.mall_builder_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  summary text not null default '' check (char_length(summary) <= 200),
  description text not null default '' check (char_length(description) <= 20000),
  base_price bigint not null check (base_price >= 0),          -- 판매가(원)
  list_price bigint check (list_price is null or list_price >= 0), -- 정가(원), 할인 표시용
  tax_type text not null default 'taxable' check (tax_type in ('taxable', 'exempt')),
  status text not null default 'draft' check (status in ('draft', 'on_sale', 'sold_out', 'hidden')),
  stock_mode text not null default 'none' check (stock_mode in ('none', 'product')),
  stock integer not null default 0 check (stock >= 0),
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_products_store on public.mall_builder_products (store_id, status, created_at desc);

-- 운영자 전용 값(원가·메모)
create table if not exists public.mall_builder_product_private (
  product_id uuid primary key references public.mall_builder_products (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  cost bigint check (cost is null or cost >= 0),
  memo text not null default '' check (char_length(memo) <= 1000)
);

create table if not exists public.mall_builder_product_categories (
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  category_id uuid not null references public.mall_builder_categories (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  primary key (product_id, category_id)
);
create index if not exists mall_builder_product_categories_cat on public.mall_builder_product_categories (category_id);

-- 몰 고정·수정 시각
create or replace function public.mall_builder_products_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.store_id <> old.store_id then
      raise exception '상품의 몰은 바꿀 수 없습니다.' using errcode = '22023';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_products_guard on public.mall_builder_products;
create trigger mall_builder_products_guard before insert or update on public.mall_builder_products
  for each row execute function public.mall_builder_products_guard();

-- 부속 표의 store_id는 상품·카테고리와 같은 몰이어야 한다
create or replace function public.mall_builder_product_links_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.mall_builder_products p where p.id = new.product_id and p.store_id = new.store_id) then
    raise exception '상품과 몰이 맞지 않습니다.' using errcode = '22023';
  end if;
  -- 카테고리 연결 표에만 category_id 칸이 있다(원가 표에서 이 칸을 읽으면 오류) — 따로 나눠 검사
  if tg_table_name = 'mall_builder_product_categories' then
    if not exists (select 1 from public.mall_builder_categories c where c.id = (to_jsonb(new) ->> 'category_id')::uuid and c.store_id = new.store_id) then
      raise exception '다른 몰의 카테고리는 쓸 수 없습니다.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_product_private_guard on public.mall_builder_product_private;
create trigger mall_builder_product_private_guard before insert or update on public.mall_builder_product_private
  for each row execute function public.mall_builder_product_links_guard();
drop trigger if exists mall_builder_product_categories_guard on public.mall_builder_product_categories;
create trigger mall_builder_product_categories_guard before insert or update on public.mall_builder_product_categories
  for each row execute function public.mall_builder_product_links_guard();

-- 보안 규칙
alter table public.mall_builder_products enable row level security;
alter table public.mall_builder_product_private enable row level security;
alter table public.mall_builder_product_categories enable row level security;

-- 상품 보기: 영업 중 몰의 판매 중·품절 상품은 누구나, 준비 중·숨김은 운영자만
create policy "mall_builder_products_read" on public.mall_builder_products
  for select using (
    public.mall_builder_is_store_staff(store_id)
    or (status in ('on_sale', 'sold_out') and exists (select 1 from public.mall_builder_stores s where s.id = store_id and s.status = 'active'))
  );
create policy "mall_builder_products_insert" on public.mall_builder_products
  for insert with check (public.mall_builder_is_store_staff(store_id));
create policy "mall_builder_products_update" on public.mall_builder_products
  for update using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));
-- 지우기는 1차에 없음(숨김으로 대신)

-- 운영자 전용 값: 그 몰 운영자만 읽고 쓴다
create policy "mall_builder_product_private_all" on public.mall_builder_product_private
  for all using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));

-- 상품-카테고리 연결: 보이는 상품의 연결은 누구나 보기, 쓰기는 운영자만
create policy "mall_builder_product_categories_read" on public.mall_builder_product_categories
  for select using (
    public.mall_builder_is_store_staff(store_id)
    or exists (select 1 from public.mall_builder_products p where p.id = product_id)
  );
create policy "mall_builder_product_categories_write" on public.mall_builder_product_categories
  for all using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));

-- 사진 저장소: 공개 버킷, 경로 첫 칸은 몰 id — 그 몰 운영자만 올리고 지운다
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mall-builder-public', 'mall-builder-public', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "mall_builder_public_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mall-builder-public' and public.mall_builder_is_store_staff(((storage.foldername(name))[1])::uuid));
create policy "mall_builder_public_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'mall-builder-public' and public.mall_builder_is_store_staff(((storage.foldername(name))[1])::uuid));
create policy "mall_builder_public_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'mall-builder-public' and public.mall_builder_is_store_staff(((storage.foldername(name))[1])::uuid));
