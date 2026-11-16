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
-- 리셀러 정산 장부 정리(Master msg_84a558f5d585·msg_c44cb959c1b1). 장부는 주문 삭제 때 order_id만 비워지고 남으므로(ON DELETE SET NULL) 주문보다 먼저 지운다.
-- 원인: 시험 회원의 추천 리셀러 OWNER1이 주문 insert 때 자동으로 붙고(orders_ref) 구매 확정 때 reward_make·reward_settle이 리워드·장부를 만든다.
-- 기대값(manifest) — Lab 읽기 근거: 리셀러 rate 5.00, 시험 상품 reward_rate 0·reward_no_extra false·공급 행 0, reward_bases = 품목별 금액
--   EXQA-1 e0102…031: 품목 041 20,000→1,000 · 042 8,000→400 = 장부 earn 1,400(아직 확정 전이면 장부 없음)
--   EXQA-2 e0102…032: 품목 043 10,000→500 = 장부 earn 500, 장부 id 7203b416-e791-487c-8708-36e9503493e8(Lab 실측)
-- 잠금 순서: 시험 주문 행(id 순 FOR UPDATE) → 리셀러 자문 잠금(출금 신청·적립과 같은 키 'mall_builder_reseller:'||id) → 검사 → 삭제.
-- 하나라도 기대와 다르면 [멈춤](트랜잭션 전체 무변경). 금액을 맞추거나 조건을 넓혀 지우지 않는다.
do $rs$
declare
  c_rs constant uuid := 'f2b49b07-7682-431f-bada-a99c8bc27956';
  v_bad text := '';
  l record;
  v_n integer;
begin
  perform 1 from public.mall_builder_orders o
   where o.id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032') order by o.id for update;
  perform pg_advisory_xact_lock(hashtext('mall_builder_reseller:' || c_rs::text));

  -- 시험 주문 장부 줄: 주문마다 earn 0~1줄, 그 밖 종류·리셀러 0
  select count(*) into v_n from public.mall_builder_reseller_ledger x
   where x.order_id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032')
     and (x.kind <> 'earn' or x.reseller_id <> c_rs);
  if v_n > 0 then v_bad := v_bad || ' 종류·리셀러 다른 줄 ' || v_n || ';'; end if;
  for l in select x.order_id, count(*) n from public.mall_builder_reseller_ledger x
            where x.order_id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032') group by x.order_id loop
    if l.n > 1 then v_bad := v_bad || ' 주문 ' || l.order_id || ' 장부 ' || l.n || '줄;'; end if;
  end loop;

  for l in select x.* from public.mall_builder_reseller_ledger x
            where x.order_id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032') loop
    if l.payout_id is not null or l.store_id <> '0489b458-d71b-4268-9b5f-94fd7da50382' then
      v_bad := v_bad || ' 장부 ' || l.id || ' 출금 연결·몰 다름;';
    end if;
    if l.order_id = 'e0102000-0000-4000-8000-000000000032'
       and not (l.id = '7203b416-e791-487c-8708-36e9503493e8' and l.amount = 500) then
      v_bad := v_bad || ' EXQA-2 장부 id·금액 다름(' || l.id || ' ' || l.amount || ');';
    end if;
    if l.order_id = 'e0102000-0000-4000-8000-000000000031' and l.amount <> 1400 then
      v_bad := v_bad || ' EXQA-1 장부 금액 ' || l.amount || '(기대 1,400);';
    end if;
    -- 연결 리워드가 품목 기대값과 정확히 같아야(품목·기준 금액·비율·금액·paid·이 장부 id)
    select count(*) into v_n from public.mall_builder_reseller_rewards w
     where w.order_id = l.order_id
       and not (w.status = 'paid' and w.ledger_id = l.id and w.reseller_id = c_rs and w.product_rate = 0 and w.reseller_rate = 5
                and (w.order_item_id, w.base_amount, w.amount) in (('e0102000-0000-4000-8000-000000000041'::uuid, 20000::bigint, 1000::bigint),
                                                                   ('e0102000-0000-4000-8000-000000000042'::uuid, 8000::bigint, 400::bigint),
                                                                   ('e0102000-0000-4000-8000-000000000043'::uuid, 10000::bigint, 500::bigint)));
    if v_n > 0 then v_bad := v_bad || ' 주문 ' || l.order_id || ' 리워드 기대와 다름 ' || v_n || '줄;'; end if;
    select count(*) into v_n from public.mall_builder_reseller_rewards w where w.order_id = l.order_id and w.ledger_id = l.id;
    if v_n <> (case when l.order_id = 'e0102000-0000-4000-8000-000000000031' then 2 else 1 end) then
      v_bad := v_bad || ' 주문 ' || l.order_id || ' 연결 리워드 ' || v_n || '줄;';
    end if;
    if (select coalesce(sum(w.amount), 0) from public.mall_builder_reseller_rewards w where w.ledger_id = l.id) <> l.amount then
      v_bad := v_bad || ' 장부 ' || l.id || ' 리워드 합계 불일치;';
    end if;
    -- 시험 줄 뒤에 시험 아닌 장부가 있으면 잔액 흐름(balance_after)이 이어지므로 멈춤
    if exists (select 1 from public.mall_builder_reseller_ledger z where z.reseller_id = c_rs and z.created_at >= l.created_at and z.id <> l.id
                and z.order_id is distinct from 'e0102000-0000-4000-8000-000000000031' and z.order_id is distinct from 'e0102000-0000-4000-8000-000000000032') then
      v_bad := v_bad || ' 장부 ' || l.id || ' 뒤에 시험 아닌 장부 있음;';
    end if;
  end loop;
  -- 장부 없는 시험 주문 리워드는 대기(pending)만 허용(주문 삭제로 함께 지워짐)
  select count(*) into v_n from public.mall_builder_reseller_rewards w
   where w.order_id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032')
     and w.ledger_id is null and w.status <> 'pending';
  if v_n > 0 then v_bad := v_bad || ' 장부 없이 처리된 시험 리워드 ' || v_n || '줄;'; end if;
  if exists (select 1 from public.mall_builder_reseller_payouts p where p.reseller_id = c_rs) then
    v_bad := v_bad || ' 리셀러 출금 신청 있음;';
  end if;

  if v_bad <> '' then
    raise exception '[멈춤] 시험 주문 리셀러 장부가 기대(manifest)와 다릅니다:% 사람이 확인하세요.', v_bad;
  end if;
  delete from public.mall_builder_reseller_ledger x
   where x.order_id in ('e0102000-0000-4000-8000-000000000031','e0102000-0000-4000-8000-000000000032') and x.reseller_id = c_rs and x.kind = 'earn';
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
