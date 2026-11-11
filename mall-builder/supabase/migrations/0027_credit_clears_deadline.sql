-- AI 쇼핑몰 빌더 — 외상 주문에 붙은 입금 기한 비우기 (2026-11-04 D3 화면 시험에서 발견)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(drop·revoke·delete 없음)
-- 원인: 외상 주문(장바구니 0014·견적 0019)은 주문을 먼저 「입금 대기」로 넣은 뒤 is_credit=true·status='paid'로 바꾼다.
--       넣는 순간 D8 트리거(mall_builder_orders_set_deadline, insert 전)가 입금 기한을 적어, 결제 완료 외상 주문에도 기한이 남았다
--       (자동 취소는 입금 대기만 보므로 취소되지는 않음 — 데이터만 틀림). 외상으로 바뀌는 순간 기한을 비운다.

create or replace function public.mall_builder_orders_clear_credit_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_credit and new.pay_deadline_at is not null then
    new.pay_deadline_at := null;
  end if;
  return new;
end;
$$;
create or replace trigger mall_builder_orders_clear_credit_deadline before update on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_clear_credit_deadline();

-- 이미 잘못 붙은 외상 주문의 기한 비우기(위 트리거가 비운다)
update public.mall_builder_orders set pay_deadline_at = null where is_credit and pay_deadline_at is not null;
