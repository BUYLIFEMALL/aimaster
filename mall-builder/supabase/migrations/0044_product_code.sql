-- D23 상품 엑셀 대량 등록·수정 — 상품 품번(2026-11-10, 주인님 결정 「추천안 5가지 그대로」)
-- 추가만 한다. 지금 지워지는 데이터는 없다.
-- 품번: 몰 안에서 겹치지 않는 상품 번호(선택 칸). 엑셀로 상품을 알아보는 기준이고, 다음 기능(빠른 주문)도 이 번호로 주문받는다.

alter table public.mall_builder_products
  add column if not exists product_code text
  check (product_code is null or product_code ~ '^[A-Za-z0-9_-]{1,40}$');

-- 몰 안에서만 고유(다른 몰은 같은 번호 가능). 대소문자는 구분하지 않는다(P001 = p001)
create unique index if not exists mall_builder_products_code_uq
  on public.mall_builder_products (store_id, upper(product_code))
  where product_code is not null;
