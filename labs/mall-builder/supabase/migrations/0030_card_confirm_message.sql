-- 0030 손님 승인 오류 문구 한국어로(D11 실제 시험, 2026-11-06): 「결제할 수 없는 주문입니다(지금 상태: cancelled)」 → 상태 이름과 「돈이 나가지 않았다」를 함께
-- 0029 mall_builder_card_confirm과 동작은 같고 이 한 문장만 다르다. 지워지는 데이터 없음
do $$
declare v_src text;
begin
  select pg_get_functiondef('public.mall_builder_card_confirm(uuid, text, bigint)'::regprocedure) into v_src;
  if position('결제할 수 없는 주문입니다(지금 상태: %).'', o.status' in v_src) = 0 then
    raise exception '0030: 바꿀 문장을 찾지 못했습니다(0029가 먼저 적용돼야 합니다)';
  end if;
  v_src := replace(v_src,
    'raise exception ''결제할 수 없는 주문입니다(지금 상태: %).'', o.status;',
    'raise exception ''이 주문은 지금 「%」 상태라 결제를 승인하지 않았습니다. 카드에서 돈이 나가지 않았습니다.'', '
    || 'case o.status when ''cancelled'' then ''취소'' when ''returned'' then ''반품 완료'' when ''paid'' then ''결제 완료'' '
    || 'when ''cancel_requested'' then ''취소 요청'' else ''처리 중'' end;');
  execute v_src;
end $$;
