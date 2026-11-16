-- 0100 되돌리기 1단계(자동 발급만 멈춤, 기록 칸은 보존): 트리거 2개 삭제 + 유저·운영사 함수 실행 권한 회수
drop trigger if exists mall_builder_orders_cash_receipt_auto on public.mall_builder_orders;
drop trigger if exists mall_builder_orders_receipt_one_kind on public.mall_builder_orders;
revoke execute on function public.mall_builder_cash_receipt_request(uuid, text, text, text) from authenticated;
revoke execute on function public.mall_builder_cash_receipt_staff(uuid, text) from authenticated;
revoke execute on function public.mall_builder_cash_receipt_settings_save(uuid, boolean) from authenticated;
