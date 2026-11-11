-- AI 쇼핑몰 빌더 F08 — 몰별 손님 가입·배송지
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 검사 규칙: src/lib/customers.ts. 추가만 하는 변경(확인 창 방지)
-- 같은 인증 계정이 몰 A·B에 따로 가입한다 — (store_id, user_id)마다 한 줄. 사업자·등급은 F12에서 칸을 추가한다.

create table if not exists public.mall_builder_store_customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  phone text not null check (phone ~ '^01[016789]-[0-9]{3,4}-[0-9]{4}$'),
  marketing_agree boolean not null default false,
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);
create index if not exists mall_builder_store_customers_user on public.mall_builder_store_customers (user_id);

create table if not exists public.mall_builder_customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.mall_builder_store_customers (id) on delete cascade,
  label text not null default '배송지' check (char_length(label) between 1 and 20),
  receiver text not null check (char_length(btrim(receiver)) between 1 and 30),
  phone text not null check (phone ~ '^01[016789]-[0-9]{3,4}-[0-9]{4}$'),
  zip text not null check (zip ~ '^[0-9]{5}$'),
  addr1 text not null check (char_length(addr1) between 2 and 120),
  addr2 text not null default '' check (char_length(addr2) <= 120),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_customer_addresses_customer on public.mall_builder_customer_addresses (customer_id);
-- 손님마다 기본 배송지는 하나만
create unique index if not exists mall_builder_customer_addresses_one_default
  on public.mall_builder_customer_addresses (customer_id) where is_default;

-- 가입 줄의 몰·계정은 바꿀 수 없다(다른 몰로 옮겨 가기 방지)
create or replace function public.mall_builder_store_customers_fixed()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.store_id <> old.store_id or new.user_id <> old.user_id then
    raise exception '가입한 몰과 계정은 바꿀 수 없습니다.' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger mall_builder_store_customers_fixed before update on public.mall_builder_store_customers
  for each row execute function public.mall_builder_store_customers_fixed();

-- 배송지의 주인(가입 줄)도 바꿀 수 없다
create or replace function public.mall_builder_customer_addresses_fixed()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.customer_id <> old.customer_id then
    raise exception '배송지의 주인은 바꿀 수 없습니다.' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger mall_builder_customer_addresses_fixed before update on public.mall_builder_customer_addresses
  for each row execute function public.mall_builder_customer_addresses_fixed();

alter table public.mall_builder_store_customers enable row level security;
-- 보기: 본인 줄, 그리고 그 몰 운영자(손님 목록)
create policy "mall_builder_store_customers_read" on public.mall_builder_store_customers
  for select using (user_id = (select auth.uid()) or public.mall_builder_is_store_staff(store_id));
-- 가입: 본인 계정으로, 영업 중인 몰에만
create policy "mall_builder_store_customers_join" on public.mall_builder_store_customers
  for insert with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.mall_builder_stores s where s.id = store_id and s.status = 'active')
  );
-- 고치기·탈퇴: 본인만(운영자 손님 관리는 F12에서 따로)
create policy "mall_builder_store_customers_update" on public.mall_builder_store_customers
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mall_builder_store_customers_delete" on public.mall_builder_store_customers
  for delete using (user_id = (select auth.uid()));

alter table public.mall_builder_customer_addresses enable row level security;
-- 배송지: 본인 것은 모두, 그 몰 운영자는 보기만(주문 처리용)
create policy "mall_builder_customer_addresses_own" on public.mall_builder_customer_addresses
  for all using (
    exists (select 1 from public.mall_builder_store_customers c where c.id = customer_id and c.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.mall_builder_store_customers c where c.id = customer_id and c.user_id = (select auth.uid()))
  );
create policy "mall_builder_customer_addresses_staff_read" on public.mall_builder_customer_addresses
  for select using (
    exists (select 1 from public.mall_builder_store_customers c where c.id = customer_id and public.mall_builder_is_store_staff(c.store_id))
  );
