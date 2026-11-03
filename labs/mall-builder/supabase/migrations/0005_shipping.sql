-- AI 쇼핑몰 빌더 F07 — 배송비 정책(무료·고정·조건부 무료, 제주·도서산간 추가)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 계산 규칙: src/lib/shipping.ts. 추가만 하는 변경(확인 창 방지)

create table if not exists public.mall_builder_shipping_policies (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  type text not null check (type in ('free', 'fixed', 'conditional')),
  base_fee bigint not null default 0 check (base_fee >= 0),
  free_over bigint check (free_over is null or free_over >= 0),
  jeju_fee bigint not null default 0 check (jeju_fee >= 0),
  island_fee bigint not null default 0 check (island_fee >= 0),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_shipping_policies_store on public.mall_builder_shipping_policies (store_id);
-- 몰마다 기본 정책은 하나만
create unique index if not exists mall_builder_shipping_policies_one_default
  on public.mall_builder_shipping_policies (store_id) where is_default;

alter table public.mall_builder_products
  add column if not exists shipping_policy_id uuid references public.mall_builder_shipping_policies (id) on delete set null;

-- 상품에는 같은 몰의 배송비 정책만
create or replace function public.mall_builder_products_shipping_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.shipping_policy_id is not null and not exists (
    select 1 from public.mall_builder_shipping_policies sp where sp.id = new.shipping_policy_id and sp.store_id = new.store_id
  ) then
    raise exception '다른 몰의 배송비 정책은 쓸 수 없습니다.' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger mall_builder_products_shipping_guard before insert or update of shipping_policy_id on public.mall_builder_products
  for each row execute function public.mall_builder_products_shipping_guard();

alter table public.mall_builder_shipping_policies enable row level security;
-- 보기: 영업 중 몰의 정책은 누구나(상세 화면 안내·주문서 계산), 쓰기는 운영자만
create policy "mall_builder_shipping_policies_read" on public.mall_builder_shipping_policies
  for select using (
    public.mall_builder_is_store_staff(store_id)
    or exists (select 1 from public.mall_builder_stores s where s.id = store_id and s.status = 'active')
  );
create policy "mall_builder_shipping_policies_write" on public.mall_builder_shipping_policies
  for all using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));
