-- AI 쇼핑몰 빌더 M2-6 — 주문·결제 기록 5년 보관: 몰 탈퇴 때 돈 기록을 지우지 않고, 정리 안 된 돈이 있으면 탈퇴를 막는다 (2026-11-15)
-- 근거: 전자상거래법 시행령 제6조(계약·청약철회·대금결제·재화 공급 기록 5년). 점검 기록 docs/RETENTION_ORDERS_5Y.md
-- 지금까지: 손님이 몰에서 탈퇴하면(mall_builder_store_customers 행 삭제) 외상 장부·포인트 장부가 함께 지워지고,
--           리셀러 행이 지워지며 리셀러 수수료 장부·지급 기록까지 연쇄로 지워졌다(주문 자체는 SET NULL로 남음).
-- 주인님 결정(2026-11-15): 기록 보존 + 진행 중이면 탈퇴 막기.
-- 1) 장부 4종의 손님·리셀러 연결을 「지워지면 비움(SET NULL)」으로 — 행은 몰(store_id)·주문(order_id)과 함께 남는다
-- 2) 탈퇴 전 검사: 진행 중 주문(입금 대기~배송 중·취소/반품 요청)·외상 잔액·받을 수수료(잔액·지급 대기)가 있으면 막음
--    (몰 자체를 지울 때처럼 연쇄 삭제 중에는 검사하지 않음 — pg_trigger_depth)
-- 주소·후기·문의·쿠폰·전용가·정기주문 같은 개인 자료는 지금처럼 함께 지워진다.

do $$
declare
  r record;
  v_name text;
begin
  for r in select * from (values
    ('mall_builder_credit_ledger', 'customer_id', 'mall_builder_store_customers'),
    ('mall_builder_point_ledger', 'customer_id', 'mall_builder_store_customers'),
    ('mall_builder_reseller_ledger', 'reseller_id', 'mall_builder_resellers'),
    ('mall_builder_reseller_payouts', 'reseller_id', 'mall_builder_resellers')
  ) t(tbl, col, parent) loop
    select c.conname into v_name
      from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'f' and c.conrelid = ('public.' || r.tbl)::regclass and a.attname = r.col and c.confrelid = ('public.' || r.parent)::regclass;
    if v_name is not null then
      execute format('alter table public.%I drop constraint %I', r.tbl, v_name);
    end if;
    execute format('alter table public.%I alter column %I drop not null', r.tbl, r.col);
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.%I (id) on delete set null',
                   r.tbl, r.tbl || '_' || r.col || '_keep_fkey', r.col, r.parent);
  end loop;
end $$;

create or replace function public.mall_builder_store_customers_leave_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_n int; v_bal bigint;
begin
  if pg_trigger_depth() > 1 then return old; end if; -- 몰 삭제 같은 연쇄 삭제
  select count(*) into v_n from public.mall_builder_orders o
   where o.customer_id = old.id and o.status in ('pending_payment', 'paid', 'preparing', 'shipping', 'cancel_requested', 'return_requested');
  if v_n > 0 then
    raise exception '진행 중인 주문이 %건 있어 탈퇴할 수 없습니다. 배송 완료·취소된 뒤 탈퇴해 주세요.', v_n;
  end if;
  select coalesce(sum(l.amount), 0) into v_bal from public.mall_builder_credit_ledger l where l.customer_id = old.id;
  if v_bal <> 0 then
    raise exception '외상 잔액(%원)이 남아 있어 탈퇴할 수 없습니다. 정산 뒤 탈퇴해 주세요.', to_char(abs(v_bal), 'FM999,999,999,990');
  end if;
  select coalesce(sum(l.amount), 0) into v_bal from public.mall_builder_reseller_ledger l
    join public.mall_builder_resellers r on r.id = l.reseller_id where r.customer_id = old.id;
  if v_bal > 0 or exists (select 1 from public.mall_builder_reseller_payouts p join public.mall_builder_resellers r on r.id = p.reseller_id
                           where r.customer_id = old.id and p.status = 'requested') then
    raise exception '받을 리셀러 수수료(지급 대기 포함)가 남아 있어 탈퇴할 수 없습니다. 지급받은 뒤 탈퇴해 주세요.';
  end if;
  return old;
end;
$$;
drop trigger if exists mall_builder_store_customers_leave_guard on public.mall_builder_store_customers;
create trigger mall_builder_store_customers_leave_guard before delete on public.mall_builder_store_customers
  for each row execute function public.mall_builder_store_customers_leave_guard();
