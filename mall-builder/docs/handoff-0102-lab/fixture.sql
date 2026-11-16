-- Lab 0102 동작 검수용 합성 자료(한 트랜잭션) — apply.sql 뒤에. 기존 유저 주문·기존 상품은 건드리지 않고, 전용 상품·전용 주문만 만든다.
-- 모든 id는 e0102000-… 고정(되돌리기에서 이것만 지움). 주문 소유자 = 시험 회원(6fbce7f8…, 일반 회원 권한), 몰 = aimaster-b2b.
-- 알림: 이력은 shipping→delivered만 넣음 — 알림 트리거(입금 대기·입금·발송·취소·반품·환불 완료) 대상 아님. 실결제·실발송 0.
begin;
do $pre$ begin
  if to_regclass('public.mall_builder_exchanges') is null then raise exception '[멈춤] 0102가 아직 없습니다(apply.sql 먼저).'; end if;
  if exists (select 1 from public.mall_builder_products where id = 'e0102000-0000-4000-8000-000000000011') then raise exception '[멈춤] 시험 자료가 이미 있습니다.'; end if;
end $pre$;

-- 교환비 3,000원 정책(시험 전용, 기본 정책 아님)
insert into public.mall_builder_shipping_policies (id, store_id, name, type, exchange_fee)
select 'e0102000-0000-4000-8000-000000000001', s.id, '[교환QA] 교환비', 'free', 3000 from public.mall_builder_stores s where s.slug = 'aimaster-b2b';

-- 상품: 티셔츠(옵션 S 5·M 5·L 0, 재고 관리) / 머그컵(옵션 없음, 본체 재고 10, 재고 관리).
-- 판매 중(on_sale) + 사업자 전용(business_only): 일반 회원 옵션 읽기(RLS product_visible)가 되도록 하되, 손님·소비자 회원에게는 안 보임(권한 확대 없음).
-- 시험 회원은 이 몰의 승인된 사업자 회원(precheck 9번).
insert into public.mall_builder_products (id, store_id, name, base_price, stock_mode, stock, shipping_policy_id, status, visibility)
select v.id::uuid, s.id, v.name, v.price, 'product', v.stock, 'e0102000-0000-4000-8000-000000000001', 'on_sale', 'business_only'
  from public.mall_builder_stores s, (values ('e0102000-0000-4000-8000-000000000011', '[교환QA] 티셔츠', 10000, 0), ('e0102000-0000-4000-8000-000000000012', '[교환QA] 머그컵', 8000, 10)) v(id, name, price, stock)
 where s.slug = 'aimaster-b2b';
insert into public.mall_builder_product_variants (id, product_id, store_id, key, "values", stock, sort)
select v.id::uuid, 'e0102000-0000-4000-8000-000000000011', s.id, v.k, jsonb_build_array(v.k), v.st, v.so
  from public.mall_builder_stores s, (values ('e0102000-0000-4000-8000-000000000021', 'S', 5, 1), ('e0102000-0000-4000-8000-000000000022', 'M', 5, 2), ('e0102000-0000-4000-8000-000000000023', 'L', 0, 3)) v(id, k, st, so)
 where s.slug = 'aimaster-b2b';

-- 주문 EXQA-1: 배송 완료 2일 전 — 티셔츠 S 2개 + 머그컵 1개(유저 신청·교환비·재발송 흐름) / EXQA-2: 배송 완료 10일 전 — 티셔츠 S 1개(7일 지남 → 유저 막힘·직원 대리 가능)
insert into public.mall_builder_orders (id, store_id, seq, order_no, user_id, customer_id, receiver, depositor, status, total, is_card, is_credit)
select v.id::uuid, s.id, v.seq, v.no, '6fbce7f8-b54e-462e-8e4b-4391b2603f65',
       (select c.id from public.mall_builder_store_customers c where c.store_id = s.id and c.user_id = '6fbce7f8-b54e-462e-8e4b-4391b2603f65'),
       '{"name":"교환QA","phone":"010-0000-0000","zip":"00000","address":"시험 주소"}'::jsonb, '교환QA', 'delivered', v.total, false, false
  from public.mall_builder_stores s, (values ('e0102000-0000-4000-8000-000000000031', 900001, 'EXQA-1', 28000), ('e0102000-0000-4000-8000-000000000032', 900002, 'EXQA-2', 10000)) v(id, seq, no, total)
 where s.slug = 'aimaster-b2b';
insert into public.mall_builder_order_items (id, order_id, product_id, variant_id, name_snapshot, option_snapshot, unit_price, qty, line_total, shipping_policy_id) values
 ('e0102000-0000-4000-8000-000000000041', 'e0102000-0000-4000-8000-000000000031', 'e0102000-0000-4000-8000-000000000011', 'e0102000-0000-4000-8000-000000000021', '[교환QA] 티셔츠', 'S', 10000, 2, 20000, 'e0102000-0000-4000-8000-000000000001'),
 ('e0102000-0000-4000-8000-000000000042', 'e0102000-0000-4000-8000-000000000031', 'e0102000-0000-4000-8000-000000000012', null, '[교환QA] 머그컵', '', 8000, 1, 8000, 'e0102000-0000-4000-8000-000000000001'),
 ('e0102000-0000-4000-8000-000000000043', 'e0102000-0000-4000-8000-000000000032', 'e0102000-0000-4000-8000-000000000011', 'e0102000-0000-4000-8000-000000000021', '[교환QA] 티셔츠', 'S', 10000, 1, 10000, 'e0102000-0000-4000-8000-000000000001');
insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_role, note, created_at) values
 ('e0102000-0000-4000-8000-000000000031', 'shipping', 'delivered', 'system', '[교환QA] 시험 자료', now() - interval '2 days'),
 ('e0102000-0000-4000-8000-000000000032', 'shipping', 'delivered', 'system', '[교환QA] 시험 자료', now() - interval '10 days');
commit;
