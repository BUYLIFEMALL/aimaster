-- AI 쇼핑몰 빌더 D21 보정 — 공동구매 판정 문자를 주문 알림과 같은 번호(주문의 받는 분 휴대폰)로 보낸다
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 함수 create or replace만.
-- 까닭(2026-11-09 실제 시험): 0041은 손님 정보의 휴대폰 번호를 써서, 시험 손님 정보에 넣어 둔 번호(끝자리 5432)로 실패 문자 1통이 나갔다.
--   주문 접수·입금 알림은 받는 분 번호(끝자리 3686)로 갔으므로 출처가 달랐다 → 주문 알림과 같게 맞춤.
create or replace function mall_builder_private.group_buy_judge(p_group_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  g public.mall_builder_group_buys%rowtype;
  v_qty integer;
  v_state text;
  v_sms boolean;
  v_name text;
  v_slug text;
  r record;
begin
  select * into g from public.mall_builder_group_buys where id = p_group_id for update;
  if g.id is null or g.status <> 'active' then return coalesce(g.status, 'none'); end if;
  v_qty := mall_builder_private.group_buy_qty(g.id);
  v_state := case when v_qty >= g.target_qty then 'succeeded' else 'failed' end;
  update public.mall_builder_group_buys set status = v_state, achieved_qty = v_qty, decided_at = now() where id = g.id;
  select x.solapi_api_key <> '' and x.solapi_api_secret <> '' and ns.sender_phone <> ''
    and exists (select 1 from public.mall_builder_store_schedulers sc where sc.store_id = x.store_id and sc.job_id is not null and not sc.paused)
    into v_sms
    from public.mall_builder_store_scheduler_secrets x join public.mall_builder_store_notify_settings ns on ns.store_id = x.store_id
   where x.store_id = g.store_id;
  if coalesce(v_sms, false) then
    select st.name, st.slug into v_name, v_slug from public.mall_builder_stores st where st.id = g.store_id;
    for r in
      select distinct public.mall_builder_digits(o.receiver ->> 'phone') as phone from public.mall_builder_order_items i
        join public.mall_builder_orders o on o.id = i.order_id
       where i.group_buy_id = g.id and o.status not in ('cancelled', 'returned') and coalesce(o.receiver ->> 'phone', '') <> ''
    loop
      continue when coalesce(r.phone, '') = '';
      insert into public.mall_builder_notifications (store_id, kind, channel, to_phone, body)
      values (g.store_id, 'customer_group_buy_' || v_state, 'sms', r.phone,
        '[' || coalesce(v_name, '쇼핑몰') || '] 공동구매 「' || g.title || '」 ' ||
        case when v_state = 'succeeded' then '목표를 달성했습니다! 곧 배송을 준비합니다.'
             else '목표 수량을 채우지 못해 주문이 취소됩니다. 결제하신 금액은 환불됩니다.' end || ' {{site}}/s/' || v_slug || '/orders');
    end loop;
  end if;
  return v_state;
end;
$$;
