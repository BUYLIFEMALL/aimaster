-- D24 거래처별 특가 — 표·보안 규칙(2026-11-10, 주인님 결정 「추천안 5가지 그대로」)
-- 추가만 한다. 지금 지워지는 데이터는 없다.
-- 한 줄 = 손님 한 명의 특가 하나.
--   상품 있음 → 그 상품 특가(금액 또는 할인율 중 하나)
--   상품 없음 → 그 손님의 「거래처 기본 할인율」(전체 상품, 할인율만)
-- 가격 순서: 상품별 특가 > 기본 할인율 > 등급가. 특가가 있으면 최종 단가(수량 구간 할인 안 함), 공동구매가가 우선.
-- 끝나는 날(ends_on, 한국 날짜)이 지나면 자동으로 원래 가격.

create table if not exists public.mall_builder_customer_prices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  customer_id uuid not null references public.mall_builder_store_customers (id) on delete cascade,
  product_id uuid references public.mall_builder_products (id) on delete cascade,
  price bigint check (price is null or price between 0 and 1000000000),
  discount_rate integer check (discount_rate is null or discount_rate between 1 and 99),
  ends_on date,
  memo text not null default '' check (char_length(memo) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (product_id is null and price is null and discount_rate is not null)
    or (product_id is not null and ((price is not null) <> (discount_rate is not null)))
  )
);

-- 손님×상품 한 줄, 손님의 기본 할인율도 한 줄
create unique index if not exists mall_builder_customer_prices_product_uq
  on public.mall_builder_customer_prices (customer_id, product_id) where product_id is not null;
create unique index if not exists mall_builder_customer_prices_default_uq
  on public.mall_builder_customer_prices (customer_id) where product_id is null;
create index if not exists mall_builder_customer_prices_store_idx on public.mall_builder_customer_prices (store_id);

-- 손님·상품이 같은 몰인지, 만든 뒤 손님·상품·몰은 못 바꿈
create or replace function public.mall_builder_customer_prices_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.mall_builder_store_customers c where c.id = new.customer_id and c.store_id = new.store_id) then
    raise exception '다른 몰의 손님입니다.' using errcode = '22023';
  end if;
  if new.product_id is not null and not exists (select 1 from public.mall_builder_products p where p.id = new.product_id and p.store_id = new.store_id) then
    raise exception '다른 몰의 상품입니다.' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    if new.store_id <> old.store_id or new.customer_id <> old.customer_id or new.product_id is distinct from old.product_id then
      raise exception '특가의 손님·상품은 바꿀 수 없습니다. 지우고 새로 넣어 주세요.' using errcode = '22023';
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;

create trigger mall_builder_customer_prices_guard before insert or update on public.mall_builder_customer_prices
  for each row execute function public.mall_builder_customer_prices_guard();

alter table public.mall_builder_customer_prices enable row level security;

-- 읽기: 직원 「손님」 권한 또는 그 손님 본인
create policy mall_builder_customer_prices_read on public.mall_builder_customer_prices for select using (
  public.mall_builder_staff_can(store_id, 'customers')
  or exists (select 1 from public.mall_builder_store_customers c where c.id = customer_id and c.user_id = auth.uid())
);
-- 쓰기: 직원 「손님」 권한만
create policy mall_builder_customer_prices_write on public.mall_builder_customer_prices for all
  using (public.mall_builder_staff_can(store_id, 'customers'))
  with check (public.mall_builder_staff_can(store_id, 'customers'));
