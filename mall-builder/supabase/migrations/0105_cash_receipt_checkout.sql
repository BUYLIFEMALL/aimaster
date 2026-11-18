-- 0105 주문서 현금영수증 자동 접수(S70) — 2026-11-19 Master msg_da32ad5e68ea(계약 대조)·msg_d8108566a5f9(격리 구현 승인).
-- 왜: 주문서에서 기존 신청 함수(0100 mall_builder_cash_receipt_request)를 그대로 부르면, 주문 직후 앱이 상태를 읽고 신청을 부르는
--     사이에 운영사가 입금 확인(paid)을 하면 신청 함수가 곧바로 볼타 발급을 부른다(0100: pending_payment가 아니면 즉시 발급).
--     앱의 상태 조회로는 이 경합을 막을 수 없으므로, 주문 행을 잠근 상태에서 「입금 대기·금액 있음·무통장」일 때만 접수한다.
-- 하는 일: 잠금 → 본인 확인 → 접수 조건 판정 → 맞으면 같은 트랜잭션에서 기존 신청 함수 호출(입금 대기라 「신청」 기록만, 발급 0).
--   조건이 하나라도 아니면 예외 없이 {accepted:false, reason:'not_eligible'} — 주문은 그대로, 손님은 주문 상세의 기존 신청을 쓴다.
--   입력 형식 오류(번호·용도)는 기존 신청 함수의 고정 문구 예외 그대로(입력값을 문구·반환에 넣지 않음).
-- 경합: 이 함수가 먼저 잠그면 입금 확인은 잠금 대기 뒤 0100 트리거(pending_payment→paid, requested → 발급)로 정상 발급.
--       입금 확인이 먼저면 이 함수는 not_eligible(즉시 발급 경로를 타지 않음).
-- 바꾸지 않는 것: 0100 신청·확인·발급·취소 함수, 자동 트리거, 금액 계산(cash_receipt_amount), 영수증/세금계산서 상호배제.
-- 선행: 0100(mall_builder_cash_receipt_request, mall_builder_private.cash_receipt_amount).

create or replace function public.mall_builder_cash_receipt_checkout(p_order_id uuid, p_type text, p_value text, p_purpose text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_on boolean;
  v_total bigint;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if o.id is null or o.user_id is distinct from auth.uid() then raise exception '주문을 찾을 수 없습니다.'; end if;

  -- 접수 조건: 값이 비어 있으면(null) 조건을 채우지 못한 것으로 본다(명시적 판정)
  select (s.settings -> 'cash_receipt' ->> 'enabled') = 'true' into v_on from public.mall_builder_stores s where s.id = o.store_id;
  v_total := coalesce((mall_builder_private.cash_receipt_amount(o.id) ->> 'total')::bigint, 0);
  if v_on is not true
     or o.is_card is distinct from false
     or o.is_credit is distinct from false
     or o.status is distinct from 'pending_payment'
     or v_total < 1
     or o.tax_invoice is not null
     or o.cash_receipt is not null then
    return jsonb_build_object('accepted', false, 'reason', 'not_eligible');
  end if;

  -- 같은 트랜잭션·같은 행 잠금 아래에서 기존 신청(입금 대기 → 「신청」 기록만, 발급 호출 없음). 반환값(번호 포함)은 돌려주지 않는다.
  perform public.mall_builder_cash_receipt_request(o.id, p_type, p_value, p_purpose);
  return jsonb_build_object('accepted', true);
end;
$$;

revoke all on function public.mall_builder_cash_receipt_checkout(uuid, text, text, text) from public, anon;
grant execute on function public.mall_builder_cash_receipt_checkout(uuid, text, text, text) to authenticated;
