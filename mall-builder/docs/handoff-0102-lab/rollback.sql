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
-- 리셀러 정산 장부는 주문 삭제 때 order_id만 비워지고 남으므로(ON DELETE SET NULL) 주문보다 먼저 시험 주문 줄만 지운다
-- (시험 회원 추천 리셀러 OWNER1이 주문에 자동으로 붙어 구매 확정 때 리워드·장부가 생김 — 2026-11-17 발견, Master msg_84a558f5d585).
-- 지우는 조건(모두 맞아야, 하나라도 다르면 [멈춤]·아무것도 안 바꿈): 시험 주문 장부 줄 0~2줄, 각 줄 종류 earn·금액 500·리셀러 OWNER1·출금 연결 없음,
-- 각 줄에 같은 주문·금액·ledger_id로 연결된 리워드, 그 리셀러에 시험 줄보다 뒤에 생긴 다른(시험 아닌) 장부 줄 없음(잔액 흐름 balance_after 보존), 그 리셀러 출금 신청 없음.
-- 리셀러의 다른 리워드(예: 다른 주문 대기 2,300원)·다른 장부·잔액은 건드리지 않는다. 시험 리워드는 주문 삭제로 함께 지워짐(CASCADE).
do $rs$
declare v_n integer; v_bad integer;
begin
  select count(*) into v_n from public.mall_builder_reseller_ledger l
   where l.order_id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032');
  select count(*) into v_bad from public.mall_builder_reseller_ledger l
   where l.order_id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032')
     and not (
       l.kind = 'earn' and l.amount = 500 and l.reseller_id = 'f2b49b07-7682-431f-bada-a99c8bc27956' and l.payout_id is null
       and exists (select 1 from public.mall_builder_reseller_rewards r where r.ledger_id = l.id and r.order_id = l.order_id and r.amount = 500)
       and not exists (select 1 from public.mall_builder_reseller_ledger l2 where l2.reseller_id = l.reseller_id and l2.created_at >= l.created_at and l2.id <> l.id
                        and l2.order_id is distinct from 'e0102000-0000-4000-8000-000000000031' and l2.order_id is distinct from 'e0102000-0000-4000-8000-000000000032')
       and not exists (select 1 from public.mall_builder_reseller_payouts p where p.reseller_id = l.reseller_id)
     );
  if v_n > 2 or v_bad > 0 then
    raise exception '[멈춤] 시험 주문 리셀러 장부가 예상(0~2줄·earn 500·OWNER1·출금 없음·뒤에 다른 장부 없음)과 다릅니다(%줄, 조건 불일치 %줄). 사람이 확인하세요.', v_n, v_bad;
  end if;
  delete from public.mall_builder_reseller_ledger l
   where l.order_id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032')
     and l.kind = 'earn' and l.amount = 500 and l.reseller_id = 'f2b49b07-7682-431f-bada-a99c8bc27956';
end $rs$;
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
