-- 0100 되돌리기 2단계(완전 제거) — 발급 기록이 0건일 때만. 칸을 지우면 기록도 사라진다
do $$ begin if exists (select 1 from public.mall_builder_orders where cash_receipt is not null) then raise exception '현금영수증 기록이 있어 완전 제거를 멈춥니다(1단계만 사용).'; end if; end $$;
drop function if exists public.mall_builder_cash_receipt_settings_save(uuid, boolean);
drop function if exists public.mall_builder_cash_receipt_request(uuid, text, text, text);
drop function if exists public.mall_builder_cash_receipt_recheck(uuid);
drop function if exists public.mall_builder_cash_receipt_staff(uuid, text);
drop function if exists mall_builder_private.orders_cash_receipt_auto();
drop function if exists mall_builder_private.orders_receipt_one_kind();
drop function if exists mall_builder_private.cash_receipt_cancel(uuid, bigint);
drop function if exists mall_builder_private.cash_receipt_issue(uuid, bigint);
drop function if exists mall_builder_private.cash_receipt_amount(uuid);
alter table public.mall_builder_orders drop column if exists cash_receipt;
