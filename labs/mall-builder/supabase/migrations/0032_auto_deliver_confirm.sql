-- 0032 자동 배송 완료·구매 확정(D12, 플랜 docs/PLAN_20261106_AUTO_DELIVER_CONFIRM.md)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(drop·revoke·delete 없음)
-- 실행: 이미 있는 몰 운영자 cron-job.org 작업이 부르는 /api/cron/deposit-expire가 자동 취소 다음에 mall_builder_auto_progress를 부른다

-- ── 0032a ── 칸 (추가만)
alter table public.mall_builder_store_schedulers add column if not exists auto_deliver_days integer check (auto_deliver_days between 1 and 60); -- 비우면 끔
alter table public.mall_builder_store_schedulers add column if not exists auto_confirm_days integer check (auto_confirm_days between 1 and 60); -- 비우면 끔
alter table public.mall_builder_store_schedulers add column if not exists last_auto_progressed integer not null default 0;
alter table public.mall_builder_store_schedulers add column if not exists total_auto_progressed integer not null default 0;

-- ── 0032b ── 함수
-- 운영자: 일수 저장(null = 끔)
create or replace function public.mall_builder_auto_progress_save(p_store_id uuid, p_deliver_days integer, p_confirm_days integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if p_deliver_days is not null and p_deliver_days not between 1 and 60 then raise exception '자동 배송 완료는 1~60일로 입력해 주세요(비우면 끔).'; end if;
  if p_confirm_days is not null and p_confirm_days not between 1 and 60 then raise exception '자동 구매 확정은 1~60일로 입력해 주세요(비우면 끔).'; end if;
  insert into public.mall_builder_store_schedulers (store_id, auto_deliver_days, auto_confirm_days) values (p_store_id, p_deliver_days, p_confirm_days)
    on conflict (store_id) do update set auto_deliver_days = excluded.auto_deliver_days, auto_confirm_days = excluded.auto_confirm_days, updated_at = now();
end;
$$;

-- 실행 주소(로그인 없이 cron-job.org가 부름): 토큰 해시로 몰 하나를 찾아
--   「배송 중」이 된 지 N일 지난 주문 → 배송 완료, 「배송 완료」가 된 지 M일 지난 주문 → 구매 확정.
-- 기준 시각 = 그 상태로 바뀐 마지막 처리 기록. 돈·재고가 오가지 않는 단계라 상태와 기록만 바꾼다(손님 「구매 확정」과 같은 결과)
create or replace function public.mall_builder_auto_progress(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_store uuid;
  s public.mall_builder_store_schedulers%rowtype;
  v_order record;
  v_delivered integer := 0;
  v_confirmed integer := 0;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token'; end if;
  select x.store_id into v_store from public.mall_builder_store_scheduler_secrets x where x.run_token_hash = p_token_hash;
  if v_store is null then raise exception 'invalid_token'; end if;
  select * into s from public.mall_builder_store_schedulers sc where sc.store_id = v_store;
  if s.store_id is null or s.paused then return jsonb_build_object('paused', coalesce(s.paused, false), 'delivered', 0, 'confirmed', 0); end if;

  if s.auto_deliver_days is not null then
    for v_order in
      select o.id from public.mall_builder_orders o
       where o.store_id = v_store and o.status = 'shipping'
         and (select max(e.created_at) from public.mall_builder_order_events e where e.order_id = o.id and e.to_status = 'shipping')
             < now() - make_interval(days => s.auto_deliver_days)
       order by o.updated_at
       limit 200
       for update skip locked
    loop
      update public.mall_builder_orders set status = 'delivered', updated_at = now() where id = v_order.id and status = 'shipping';
      if found then
        insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
        values (v_order.id, 'shipping', 'delivered', null, 'system', '발송 ' || s.auto_deliver_days || '일 지나 자동 배송 완료');
        v_delivered := v_delivered + 1;
      end if;
    end loop;
  end if;

  if s.auto_confirm_days is not null then
    for v_order in
      select o.id from public.mall_builder_orders o
       where o.store_id = v_store and o.status = 'delivered'
         and (select max(e.created_at) from public.mall_builder_order_events e where e.order_id = o.id and e.to_status = 'delivered')
             < now() - make_interval(days => s.auto_confirm_days)
       order by o.updated_at
       limit 200
       for update skip locked
    loop
      update public.mall_builder_orders set status = 'confirmed', updated_at = now() where id = v_order.id and status = 'delivered';
      if found then
        insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
        values (v_order.id, 'delivered', 'confirmed', null, 'system', '배송 완료 ' || s.auto_confirm_days || '일 지나 자동 구매 확정');
        v_confirmed := v_confirmed + 1;
      end if;
    end loop;
  end if;

  update public.mall_builder_store_schedulers sc set
    last_auto_progressed = v_delivered + v_confirmed,
    total_auto_progressed = sc.total_auto_progressed + v_delivered + v_confirmed
  where sc.store_id = v_store;
  return jsonb_build_object('paused', false, 'delivered', v_delivered, 'confirmed', v_confirmed);
end;
$$;
