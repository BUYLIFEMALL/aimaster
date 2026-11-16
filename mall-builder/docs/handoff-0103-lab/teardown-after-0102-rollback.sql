-- 0103 뒷정리(한 트랜잭션) — 지금 실행하지 않음. 0102 전체 정리(handoff-0102-lab/rollback.sql, b5c3613c…)를 Master 지시로 실행한 **뒤에만**.
-- 0103은 0102 함수를 다시 정의하고 도우미 1개(exchange_order_status_ok)와 적용 기록 1줄만 더한다. 0102 정리는 같은 이름의 함수들을 지우므로
-- 남는 것은 이 도우미와 0103 기록뿐 — 이 파일이 그 둘만 지운다.
-- 0103만 되돌려 0102 옛 지킴으로 돌아가는 방식은 쓰지 않는다(교환 진행 중 자동 구매 확정이 회차 전체를 실패시키는 P1 재발). 기본은 앞으로 고치기.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $pre$ begin
  if not exists (select 1 from public.mall_builder_stores where slug = 'aimaster-b2b') then raise exception '[멈춤] Lab이 맞는지 확인하세요.'; end if;
  if to_regclass('public.mall_builder_exchanges') is not null
     or exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') then
    raise exception '[멈춤] 0102가 아직 남아 있습니다. 0102 정리(rollback.sql)를 먼저 실행해야 합니다.';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window') > 1 then
    raise exception '[멈춤] 0103 기록이 여러 줄입니다. 사람이 확인하세요.';
  end if;
end $pre$;
drop function if exists mall_builder_private.exchange_order_status_ok(text);
delete from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window';
commit;
