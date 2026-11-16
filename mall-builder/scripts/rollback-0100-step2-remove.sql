-- 0100 되돌리기 2단계(완전 제거) — 발급 기록이 0건일 때만. 칸을 지우면 기록도 사라진다
-- 한 묶음(트랜잭션): 중간에 실패하면 아무것도 지우지 않음. 1단계를 먼저 안 했어도 되도록 트리거부터 지움(의존 순서) — B2B-20261116-07
begin;
do $$ begin if exists (select 1 from public.mall_builder_orders where cash_receipt is not null) then raise exception '현금영수증 기록이 있어 완전 제거를 멈춥니다(1단계만 사용).'; end if; end $$;
drop trigger if exists mall_builder_orders_cash_receipt_auto on public.mall_builder_orders;
drop trigger if exists mall_builder_orders_receipt_one_kind on public.mall_builder_orders;
drop function if exists public.mall_builder_cash_receipt_settings_save(uuid, boolean);
drop function if exists public.mall_builder_cash_receipt_request(uuid, text, text, text);
drop function if exists public.mall_builder_cash_receipt_recheck(uuid);
drop function if exists public.mall_builder_cash_receipt_staff(uuid, text);
drop function if exists mall_builder_private.orders_cash_receipt_auto();
drop function if exists mall_builder_private.orders_receipt_one_kind();
drop function if exists mall_builder_private.cash_receipt_cancel(uuid, bigint);
drop function if exists mall_builder_private.cash_receipt_issue(uuid, bigint);
drop function if exists mall_builder_private.cash_receipt_target(uuid); -- B2B-20261116-07 추가 함수(부르는 쪽 함수를 먼저 지운 뒤)
drop function if exists mall_builder_private.cash_receipt_amount(uuid);
alter table public.mall_builder_orders drop column if exists cash_receipt;
commit;
