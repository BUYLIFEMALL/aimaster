-- Lab 0102 되돌리기(한 트랜잭션) — 대상: Lab(ref rjjtjakljjxsgjelqgek)만. 검수로 생긴 자료만 지우고 0102가 만든 것만 없앤다. 기존 표·기존 주문은 건드리지 않음.
-- 순서: 시험 자료(교환 → 주문[상품 줄·이력·알림은 주문에 딸려 지워짐] → 옵션 → 상품 → 정책) → 주문 상태 지킴 트리거 → 함수(공개 4·내부 7) → 교환 표 → 적용 기록
begin;
do $pre$ begin
  if not exists (select 1 from public.mall_builder_stores where slug = 'aimaster-b2b') then raise exception '[멈춤] Lab이 맞는지 확인하세요.'; end if;
  -- 시험 자료가 아닌 교환이 있으면 멈춤(그 교환은 사람이 판단)
  if to_regclass('public.mall_builder_exchanges') is not null and exists (
    select 1 from public.mall_builder_exchanges where order_id not in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032')
  ) then raise exception '[멈춤] 시험 주문이 아닌 교환이 있습니다. 먼저 확인하세요.'; end if;
end $pre$;

-- 시험 자료(고정 id만)
do $fx$ begin
  if to_regclass('public.mall_builder_exchanges') is not null then
    delete from public.mall_builder_exchanges where order_id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032');
  end if;
end $fx$;
delete from public.mall_builder_orders where id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032');
delete from public.mall_builder_product_variants where id in ('e0102000-0000-4000-8000-000000000021','e0102000-0000-4000-8000-000000000022','e0102000-0000-4000-8000-000000000023');
delete from public.mall_builder_products where id in ('e0102000-0000-4000-8000-000000000011','e0102000-0000-4000-8000-000000000012');
delete from public.mall_builder_shipping_policies where id = 'e0102000-0000-4000-8000-000000000001';

-- 0102가 만든 것
drop trigger if exists mall_builder_orders_exchange_guard on public.mall_builder_orders;
drop function if exists public.mall_builder_request_exchange(uuid, integer, uuid, text, text);
drop function if exists public.mall_builder_exchange_step(uuid, text, text, text, text);
drop function if exists public.mall_builder_exchange_fee(uuid, bigint);
drop function if exists public.mall_builder_exchange_fee_paid(uuid);
drop function if exists mall_builder_private.orders_exchange_guard();
drop function if exists mall_builder_private.lock_exchange(uuid);
drop function if exists mall_builder_private.exchange_order_delivered(uuid);
drop function if exists mall_builder_private.exchange_stock(uuid, uuid, integer, text);
drop function if exists mall_builder_private.exchange_event(uuid, text, text);
drop function if exists mall_builder_private.variant_label(uuid);
drop function if exists mall_builder_private.delivered_at(uuid);
drop table if exists public.mall_builder_exchanges;
delete from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges';
commit;
