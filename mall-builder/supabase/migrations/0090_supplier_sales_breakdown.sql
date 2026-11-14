-- AI 쇼핑몰 빌더 M3-S2·S3 — 공급사 판매·정산 품목별 분해, 내 상품 픽 수 (2026-11-15 마스터 플랜 §4 M3-S2·S3)
-- 백엔드 DB 번호 0090~0099(0067~0079 다 씀, 상호 인수인계 §2).
-- 1) 판매 분해: 공급사 본인 품목만, 기간(주문일, 한국 시간)·상태로 거르고 품목마다
--    판매 금액(판매가 × 남은 수량) / 공급가(주문 때 고정 × 남은 수량) / 리셀러 몫(실제 리워드 — 확정 전은 남은 수량 비율, 보류·삭제 0) / 본사 몫(나머지) + 리셀러 코드.
--    유저 이름·연락처·주소는 돌려주지 않는다(발송용 주소는 기존 「내 주문」 화면 그대로).
--    본사 몫 = 판매 금액 − 공급가 − 리셀러 몫. 쿠폰·포인트 할인과 배송비는 본사 쪽 일이라 넣지 않는다(공급가는 할인과 무관).
-- 2) 내 상품 픽 수: 내 상품을 픽한 활동 중 리셀러 수(누가 픽했는지는 돌려주지 않음)
-- 추가만(표·칸 없음, 함수 둘).

create or replace function public.mall_builder_supplier_sales(p_store_id uuid, p_from date default null, p_to date default null, p_status text default null)
returns table (item_id uuid, order_no text, ordered_at timestamptz, order_status text, product_id uuid, name text, option text,
               qty int, sales bigint, supply bigint, reseller bigint, hq bigint, reseller_code text)
language plpgsql stable security definer set search_path = '' as $$
declare v_sid uuid;
begin
  select x.id into v_sid from public.mall_builder_suppliers x
   where x.store_id = p_store_id and x.user_id = auth.uid() and x.status in ('active', 'paused');
  if auth.uid() is null or v_sid is null then raise exception '이 몰의 공급사 계정이 아닙니다.'; end if;
  return query
    select i.id, o.order_no, o.created_at, o.status, i.product_id, i.name_snapshot, i.option_snapshot,
           z.left_qty, z.sales, z.supply, z.rs, z.sales - z.supply - z.rs, rs.code
      from public.mall_builder_order_item_supply s
      join public.mall_builder_order_items i on i.id = s.order_item_id
      join public.mall_builder_orders o on o.id = s.order_id
      left join public.mall_builder_resellers rs on rs.id = o.reseller_id
      cross join lateral (
        select greatest(i.qty - coalesce(i.cancelled_qty, 0), 0)::int as left_qty,
               (greatest(i.qty - coalesce(i.cancelled_qty, 0), 0)::bigint * i.unit_price) as sales,
               (greatest(i.qty - coalesce(i.cancelled_qty, 0), 0)::bigint * s.supply_price) as supply,
               -- 리셀러 몫: 확정 뒤(paid)는 이미 남은 수량으로 다시 계산된 값, 확정 전(pending)은 남은 수량 비율만큼, 보류·삭제는 0
               coalesce((select case w.status when 'paid' then w.amount
                                              when 'pending' then case when i.qty > 0 then floor(w.amount::numeric * greatest(i.qty - coalesce(i.cancelled_qty, 0), 0) / i.qty)::bigint else 0 end
                                              else 0 end
                           from public.mall_builder_reseller_rewards w where w.order_item_id = i.id), 0)::bigint as rs
      ) z
     where s.supplier_id = v_sid
       and o.status <> 'pending_payment'
       and (p_status is null or o.status = p_status)
       and (p_from is null or o.created_at >= (p_from::timestamp at time zone 'Asia/Seoul'))
       and (p_to is null or o.created_at < ((p_to + 1)::timestamp at time zone 'Asia/Seoul'))
     order by o.created_at desc
     limit 2000;
end;
$$;
revoke all on function public.mall_builder_supplier_sales(uuid, date, date, text) from public, anon;
grant execute on function public.mall_builder_supplier_sales(uuid, date, date, text) to authenticated;

create or replace function public.mall_builder_supplier_pick_counts(p_store_id uuid)
returns table (product_id uuid, picks bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_sid uuid;
begin
  select x.id into v_sid from public.mall_builder_suppliers x
   where x.store_id = p_store_id and x.user_id = auth.uid() and x.status in ('active', 'paused');
  if auth.uid() is null or v_sid is null then raise exception '이 몰의 공급사 계정이 아닙니다.'; end if;
  return query
    select k.product_id, count(*)::bigint
      from public.mall_builder_reseller_picks k
      join public.mall_builder_products p on p.id = k.product_id
      join public.mall_builder_resellers r on r.id = k.reseller_id and r.active
     where p.store_id = p_store_id and p.supplier_id = v_sid
     group by k.product_id;
end;
$$;
revoke all on function public.mall_builder_supplier_pick_counts(uuid) from public, anon;
grant execute on function public.mall_builder_supplier_pick_counts(uuid) to authenticated;
