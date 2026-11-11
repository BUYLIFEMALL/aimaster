-- 0031 환불 거절 문구의 마침표 두 개 정리(D11 재시험, 2026-11-06): 토스 문구 끝 「.」 뒤에 우리 「.」가 붙어 「…않습니다..」로 보이던 것
-- 0029 mall_builder_private.card_refund와 동작은 같고 이 한 줄만 다르다. 지워지는 데이터 없음
do $$
declare v_src text; v_old text := '''카드 환불이 되지 않아 취소하지 않았습니다: %. 「결제 다시 확인」으로 카드사 기록을 확인해 주세요.'', coalesce(v_body ->> ''message'', v_status::text);';
begin
  select pg_get_functiondef('mall_builder_private.card_refund(uuid, bigint, text, text)'::regprocedure) into v_src;
  if position(v_old in v_src) = 0 then raise exception '0031: 바꿀 문장을 찾지 못했습니다(0029가 먼저 적용돼야 합니다)'; end if;
  v_src := replace(v_src, v_old,
    '''카드 환불이 되지 않아 취소하지 않았습니다: %. 「결제 다시 확인」으로 카드사 기록을 확인해 주세요.'', rtrim(coalesce(v_body ->> ''message'', v_status::text), ''. '');');
  execute v_src;
end $$;
