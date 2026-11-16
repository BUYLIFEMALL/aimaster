-- 0100 되돌리기 1단계(자동 발급만 멈춤, 기록 칸은 보존): 트리거 2개 삭제 + 유저·운영사 함수 실행 권한 회수
-- + 발급 함수를 「볼타에 발급 요청을 보내지 않는」 정지판으로 바꿈(B2B-20261116-07 P1-2: 「상태 다시 확인」의 취소 확정 뒤 재발급 경로까지 막음)
-- 남는 기능: 「상태 다시 확인」(볼타 조회 GET)과 그 결과 반영, 결과 확인 뒤 주문 기준 전액 취소 요청(볼타 취소 POST — 영수증을 없애는 쪽이라 유지).
-- 막히는 것: 유저 신청, 운영사 다시 발급·취소 다시 요청·취소 후 다시 발급, 몰 설정 저장, 새 발급·재발급 POST(/v1/cashReceipts) 전부.
-- 되살리기: 0100_cash_receipts.sql을 다시 실행(함수 원래대로 + 트리거 + 실행 권한).
drop trigger if exists mall_builder_orders_cash_receipt_auto on public.mall_builder_orders;
drop trigger if exists mall_builder_orders_receipt_one_kind on public.mall_builder_orders;
revoke execute on function public.mall_builder_cash_receipt_request(uuid, text, text, text) from authenticated;
revoke execute on function public.mall_builder_cash_receipt_staff(uuid, text) from authenticated;
revoke execute on function public.mall_builder_cash_receipt_settings_save(uuid, boolean) from authenticated;
create or replace function mall_builder_private.cash_receipt_issue(p_order_id uuid, p_amount bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  cr jsonb;
begin
  select * into o from public.mall_builder_orders where id = p_order_id;
  cr := o.cash_receipt;
  if cr is null then return null; end if;
  cr := cr || jsonb_build_object('status', case when cr ->> 'status' = 'requested' then 'failed' else cr ->> 'status' end,
    'error', '현금영수증 자동 발급을 멈춘 상태라 볼타에 발급 요청을 보내지 않았습니다.');
  update public.mall_builder_orders set cash_receipt = cr where id = o.id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (o.id, o.status, o.status, auth.uid(), 'system', '현금영수증 발급 안 함(자동 발급 멈춤)');
  return cr;
end;
$$;
revoke all on function mall_builder_private.cash_receipt_issue(uuid, bigint) from public;
