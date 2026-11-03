-- AI 쇼핑몰 빌더 F05 — 상품 옵션(최대 3단 조합)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 계산 규칙: src/lib/options.ts
-- 재고 규칙: 상품 재고 방식이 「수량 관리(product)」이고 옵션이 있으면 → 옵션 조합별 재고(variants.stock)를 쓴다.
-- (주인님 지시 2026-11-03 「묻지 말고 그냥 하라」 — DB 변경은 지우기·덮어쓰기 없이 추가만 해서 확인 창이 뜨지 않게 한다)

alter table public.mall_builder_products
  add column if not exists option_groups jsonb not null default '[]'::jsonb
  check (jsonb_typeof(option_groups) = 'array' and jsonb_array_length(option_groups) <= 3);

create table if not exists public.mall_builder_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 200),
  "values" jsonb not null check (jsonb_typeof("values") = 'array'),
  extra_price bigint not null default 0,
  stock integer not null default 0 check (stock >= 0),
  sku text not null default '' check (char_length(sku) <= 50),
  is_active boolean not null default true,
  sort integer not null default 0,
  unique (product_id, key)
);
create index if not exists mall_builder_product_variants_product on public.mall_builder_product_variants (product_id, sort);

create trigger mall_builder_product_variants_guard before insert or update on public.mall_builder_product_variants
  for each row execute function public.mall_builder_product_links_guard();

alter table public.mall_builder_product_variants enable row level security;
-- 보기: 보이는 상품의 조합은 누구나(상품 표 보안 규칙을 그대로 따름), 쓰기는 운영자만
create policy "mall_builder_product_variants_read" on public.mall_builder_product_variants
  for select using (
    public.mall_builder_is_store_staff(store_id)
    or exists (select 1 from public.mall_builder_products p where p.id = product_id)
  );
create policy "mall_builder_product_variants_write" on public.mall_builder_product_variants
  for all using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));
