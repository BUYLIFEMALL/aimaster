-- D24 거래처별 특가 — 주문 함수 mall_builder_place_order_v2의 가격 계산에 특가 단계를 넣는다.
-- 함수 정의만 바꾼다. 지금 지워지는 데이터는 없다.
-- 함수 전체를 다시 옮겨 적지 않고, 지금 정의를 읽어 정확히 네 곳만 바꾼다(각 자리가 정확히 한 번 있는지 확인, 아니면 멈춤).
--   1. 변수 3개 추가
--   2. 등급가 계산 바로 앞에서 특가 찾기(상품별 특가 > 기본 할인율, 끝나는 날 지난 것 제외)
--   3. 단가: 특가가 있으면 특가(금액 + 옵션 추가금 / 할인율은 판매가 + 추가금에 적용), 없으면 기존 등급가
--   4. 가격 내역 이름 「거래처 특가」, 특가면 수량 구간 할인 건너뜀(특가 = 최종 단가). 공동구매가는 그대로 우선
-- 화면 계산은 src/lib/pricing.ts의 같은 순서(customerPrice)와 맞춘다.

do $$
declare
  d text;
  sig constant text := 'public.mall_builder_place_order_v2(uuid,uuid,text,text,bigint,text,uuid,bigint)';
  pats text[] := array[
    E'  v_prev integer;\n',
    E'    v_unit := greatest(0, case\n      when v_line.grade_price is not null then v_line.grade_price + v_extra\n',
    E'''등급가('' || coalesce(v_grade_name, '''') || '')''',
    E'if found and v_gb_id is null then'
  ];
  reps text[] := array[
    E'  v_prev integer;\n  v_cp_found boolean;\n  v_cp_price bigint;\n  v_cp_rate integer;\n',
    E'    -- D24 거래처 특가: 상품별 특가 > 기본 할인율 > 등급가. 특가는 최종 단가(수량 할인 안 함), 공동구매가가 우선\n'
    || E'    select cp.price, cp.discount_rate into v_cp_price, v_cp_rate from public.mall_builder_customer_prices cp\n'
    || E'     where cp.customer_id = v_customer.id and (cp.product_id = v_line.product_id or cp.product_id is null)\n'
    || E'       and (cp.ends_on is null or cp.ends_on >= (now() at time zone ''Asia/Seoul'')::date)\n'
    || E'     order by (cp.product_id is null) limit 1;\n'
    || E'    v_cp_found := found;\n'
    || E'    v_unit := greatest(0, case\n'
    || E'      when v_cp_found and v_cp_price is not null then v_cp_price + v_extra\n'
    || E'      when v_cp_found then floor(v_base * (100 - v_cp_rate) / 100.0)::bigint\n'
    || E'      when v_line.grade_price is not null then v_line.grade_price + v_extra\n',
    E'case when v_cp_found then ''거래처 특가'' else ''등급가('' || coalesce(v_grade_name, '''') || '')'' end',
    E'if found and v_gb_id is null and not v_cp_found then'
  ];
  i int;
  cnt int;
begin
  d := pg_get_functiondef(sig::regprocedure);
  if position('v_cp_found' in d) > 0 then
    raise notice '이미 적용돼 있습니다 — 건너뜀';
    return;
  end if;
  for i in 1 .. array_length(pats, 1) loop
    cnt := (length(d) - length(replace(d, pats[i], ''))) / length(pats[i]);
    if cnt <> 1 then
      raise exception '바꿀 자리 %번이 %번 있습니다(1번이어야 함) — 멈춤', i, cnt;
    end if;
    d := replace(d, pats[i], reps[i]);
  end loop;
  execute d;
end $$;
