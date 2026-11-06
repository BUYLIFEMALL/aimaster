-- AI 쇼핑몰 빌더 D14 — 통계(운영자 「통계」 메뉴)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(docs/mall/LESSONS_LEARNED.md 점검 목록).
-- 함수 정의만 만든다(읽기 전용). 지금 지워지는 데이터는 없다.
-- 매출 = 결제된 상태의 주문 금액 total 합(부분 취소는 total이 남은 금액으로 갱신됨). 취소·반품 완료는 따로 센다.
-- 기간은 주문 생성 시각, 날짜 묶기는 한국 시간.

create or replace function public.mall_builder_stats(p_store_id uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰의 통계를 볼 권한이 없습니다.'; end if;
  if p_from is null or p_to is null or p_to <= p_from then raise exception '기간이 올바르지 않습니다.'; end if;
  if p_to - p_from > interval '400 days' then raise exception '기간은 400일까지 볼 수 있습니다.'; end if;

  with o as (
    select * from public.mall_builder_orders
     where store_id = p_store_id and created_at >= p_from and created_at < p_to
  ), sold as (
    select * from o where status in ('paid', 'preparing', 'shipping', 'delivered', 'confirmed', 'cancel_requested', 'return_requested')
  )
  select jsonb_build_object(
    'summary', (select jsonb_build_object(
        'orders', (select count(*) from sold),
        'sales', (select coalesce(sum(total), 0) from sold),
        'avg_order', (select coalesce(round(avg(total)), 0) from sold),
        'cancelled_count', (select count(*) from o where status in ('cancelled', 'returned')),
        'cancelled_amount', (select coalesce(sum(total), 0) from o where status in ('cancelled', 'returned')),
        'pending_count', (select count(*) from o where status = 'pending_payment'),
        'all_orders', (select count(*) from o),
        'new_customers', (select count(*) from public.mall_builder_store_customers c where c.store_id = p_store_id and c.created_at >= p_from and c.created_at < p_to),
        'total_customers', (select count(*) from public.mall_builder_store_customers c where c.store_id = p_store_id),
        'buyers', (select count(distinct user_id) from sold)
      )),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'orders', d.orders, 'sales', d.sales) order by d.day)
        from (select (created_at at time zone 'Asia/Seoul')::date as day, count(*) as orders, sum(total) as sales from sold group by 1) d
    ), '[]'::jsonb),
    'by_status', coalesce((
      select jsonb_agg(jsonb_build_object('status', s.status, 'count', s.count) order by s.count desc)
        from (select status, count(*) as count from o group by 1) s
    ), '[]'::jsonb),
    'pay_method', coalesce((
      select jsonb_agg(jsonb_build_object('method', m.method, 'count', m.count, 'amount', m.amount) order by m.amount desc)
        from (select case when is_card then 'card' when is_credit then 'credit' else 'bank' end as method, count(*) as count, sum(total) as amount from sold group by 1) m
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object('product_id', t.product_id, 'name', t.name, 'qty', t.qty, 'amount', t.amount) order by t.amount desc)
        from (
          select i.product_id, max(i.name_snapshot) as name, sum(i.qty - i.cancelled_qty) as qty, sum(i.unit_price * (i.qty - i.cancelled_qty)) as amount
            from public.mall_builder_order_items i join sold on sold.id = i.order_id
           where i.qty > i.cancelled_qty
           group by i.product_id
           order by amount desc limit 10
        ) t
    ), '[]'::jsonb),
    'cart_top', coalesce((
      select jsonb_agg(jsonb_build_object('product_id', c.product_id, 'name', c.name, 'qty', c.qty, 'users', c.users) order by c.users desc, c.qty desc)
        from (
          select ci.product_id, max(p.name) as name, sum(ci.qty) as qty, count(distinct ci.user_id) as users
            from public.mall_builder_cart_items ci join public.mall_builder_products p on p.id = ci.product_id
           where ci.store_id = p_store_id
           group by ci.product_id
           order by users desc, qty desc limit 10
        ) c
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
