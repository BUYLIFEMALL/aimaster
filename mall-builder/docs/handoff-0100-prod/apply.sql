-- ============================================================================================
-- AI 쇼핑몰 빌더 운영 DB 0100(현금영수증) 수동 적용 묶음 — 주인님이 Supabase 운영 프로젝트 SQL 편집기에서 한 번 실행
-- 대상: Supabase 프로젝트 AIMaster (ref esgxyikcnnvmlhygjkth, buylifemall@gmail.com 조직) — 다른 프로젝트(Lab rjjtjak…)에서 실행 금지
-- 출처: 커밋 1aea8ec0f의 mall-builder/supabase/migrations/0100_cash_receipts.sql 원문(LF) 그대로, sha256 060bc99af8de5b6807bc9bb9125f3f8b2838cc0098e8a8872912d7e9c01b5798
-- 한 트랜잭션: 사전 점검 실패·중간 오류면 아무것도 들어가지 않음(전부 되거나 전부 안 됨). 0101·다른 SQL 포함 없음.
-- B2B-20261116-10 (Claude B2BBackend). 실행 뒤 같은 폴더 verify.sql(읽기 전용)로 확인.
-- ============================================================================================
begin;

-- [사전 점검] 0099까지 있고 0100은 아직 없을 때만 진행
do $pre$ begin
  if not exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0099_returns_refunds') then
    raise exception '[멈춤] 0099(반품·환불)가 이 DB에 없습니다. 운영 프로젝트가 맞는지 확인하세요.';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations where name like 'mall_builder_0100%')
     or exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mall_builder_orders' and column_name = 'cash_receipt') then
    raise exception '[멈춤] 0100이 이미 적용돼 있습니다. 다시 실행하지 마세요.';
  end if;
end $pre$;

-- ===== 0100_cash_receipts.sql 원문 시작 =====
-- 0100 M2-10 현금영수증(볼타) — 2026-11-15 [역할: mall-builder]
-- 유저가 무통장 입금 주문에 신청 → 입금 확인(입금 대기 → 결제 완료) 때 자동 발급 요청, 취소·반품 때 자동 전액 취소,
-- 반품비를 빼고 환불했으면 취소 확정 뒤 남은 금액으로 다시 발급. 볼타 호출은 0039의 mall_builder_private.bolta_call 재사용.
-- 볼타 API(2026-11-15 docs.bolta.io): POST /v1/cashReceipts(202 issuanceKey), GET /v1/cashReceipts/status?clientReferenceId=,
-- POST /v1/cashReceipts/{issuanceKey}/cancellation(전액만). 발행 무료.
-- 주문의 cash_receipt(jsonb): type PHONE|BUSINESS_REGISTRATION_NUMBER · value · purpose · status
--   requested(신청, 입금 전) · issuing(접수) · issued(발급 완료) · failed(거절) · unknown(결과 모름) · cancelling · cancelled · cancel_failed
--   · ref·issuance_key·approval_no·amount·attempt·cancel_ref·cancel_key·reissue_amount·error·requested_at

alter table public.mall_builder_orders add column if not exists cash_receipt jsonb;

-- 몰 설정: settings.cash_receipt.enabled (대표만 바꿈)
create or replace function public.mall_builder_cash_receipt_settings_save(p_store_id uuid, p_enabled boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'owner') then raise exception '몰 대표만 바꿀 수 있습니다.'; end if;
  update public.mall_builder_stores
     set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{cash_receipt}', jsonb_build_object('enabled', coalesce(p_enabled, false)))
   where id = p_store_id;
  return coalesce(p_enabled, false);
end;
$$;

-- 발급할 금액(지금 결제 금액 − 환불 금액)과 과세·면세 나누기(과세 몫은 세금계산서 계산 재사용)
create or replace function mall_builder_private.cash_receipt_amount(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_lines jsonb;
  v_total bigint;
  v_taxable bigint;
  v_vat bigint;
begin
  select * into o from public.mall_builder_orders where id = p_order_id;
  v_total := greatest(o.total - case when o.refund_status <> 'none' then o.refund_amount else 0 end, 0);
  v_lines := mall_builder_private.tax_invoice_lines(p_order_id);
  v_taxable := least(coalesce((v_lines ->> 'total')::bigint, 0), v_total);
  v_vat := round(v_taxable / 11.0)::bigint;
  return jsonb_build_object('total', v_total, 'supply', v_taxable - v_vat, 'vat', v_vat, 'tax_free', v_total - v_taxable);
end;
$$;

-- 지금 주문 상태 기준으로 「유효해야 할」 현금영수증 금액(취소 0, 반품 남은 금액, 그 밖은 결제 − 환불).
-- 결과 모름·취소 중에 주문이 바뀌어도 옛 금액이 아니라 이 값으로 맞춘다(B2B-20261116-07)
create or replace function mall_builder_private.cash_receipt_target(p_order_id uuid)
returns bigint language plpgsql stable security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
begin
  select * into o from public.mall_builder_orders where id = p_order_id;
  if o.status = 'cancelled' then return 0; end if;
  if o.status = 'returned' then return greatest(o.total - coalesce(o.refund_amount, 0), 0); end if;
  return (mall_builder_private.cash_receipt_amount(p_order_id) ->> 'total')::bigint;
end;
$$;

-- 볼타에 발급 요청(권한 검사 없음 — 아래 함수·트리거만 부름). 실패해도 예외를 내지 않고 상태에 적는다
create or replace function mall_builder_private.cash_receipt_issue(p_order_id uuid, p_amount bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  cr jsonb;
  v_key text;
  v_info jsonb;
  v_amt jsonb;
  v_total bigint;
  v_attempt integer;
  v_ref text;
  v_item text;
  v_n integer;
  v_body jsonb;
  v_status integer;
  v_resp jsonb;
  v_state text;
  v_err text := '';
begin
  select * into o from public.mall_builder_orders where id = p_order_id;
  cr := o.cash_receipt;
  if cr is null then return null; end if;
  select x.bolta_api_key into v_key from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  select coalesce(s.business_info, '{}'::jsonb) into v_info from public.mall_builder_stores s where s.id = o.store_id;
  v_amt := mall_builder_private.cash_receipt_amount(p_order_id);
  if p_amount is not null then
    -- 다시 발급(반품비 남은 금액 등): 과세 비율을 그대로 줄인다
    v_total := least(p_amount, (v_amt ->> 'supply')::bigint + (v_amt ->> 'vat')::bigint); -- 과세 몫(넘지 않게)
    v_amt := jsonb_build_object('total', p_amount, 'supply', v_total - round(v_total / 11.0)::bigint,
      'vat', round(v_total / 11.0)::bigint, 'tax_free', p_amount - v_total);
  end if;
  v_total := (v_amt ->> 'total')::bigint;
  v_attempt := coalesce((cr ->> 'attempt')::integer, 0) + 1;
  v_ref := 'mbcr-' || o.id || '-' || v_attempt;

  if coalesce(v_key, '') = '' then
    v_state := 'failed'; v_err := '운영사가 볼타 API 키를 아직 넣지 않았습니다.';
  elsif regexp_replace(coalesce(v_info ->> 'business_no', ''), '\D', '', 'g') !~ '^\d{10}$' or coalesce(v_info ->> 'company_name', '') = '' or coalesce(v_info ->> 'ceo_name', '') = '' or coalesce(v_info ->> 'phone', '') = '' then
    v_state := 'failed'; v_err := '쇼핑몰 정보에 상호·대표자·사업자등록번호·전화번호가 필요합니다.';
  elsif v_total < 1 then
    v_state := 'failed'; v_err := '발급할 금액이 없습니다.';
  else
    select count(*) into v_n from public.mall_builder_order_items i where i.order_id = o.id and i.qty > i.cancelled_qty;
    select i.name_snapshot into v_item from public.mall_builder_order_items i where i.order_id = o.id and i.qty > i.cancelled_qty order by i.unit_price * (i.qty - i.cancelled_qty) desc limit 1;
    v_item := coalesce(v_item, '상품');
    if v_n > 1 then v_item := left(v_item, 20 - char_length(' 외 ' || (v_n - 1) || '건')) || ' 외 ' || (v_n - 1) || '건'; else v_item := left(v_item, 20); end if;
    v_body := jsonb_build_object(
      'itemName', v_item,
      'issuer', jsonb_build_object(
        'businessRegistrationNumber', regexp_replace(v_info ->> 'business_no', '\D', '', 'g'),
        'organizationName', left(v_info ->> 'company_name', 20), 'representativeName', left(v_info ->> 'ceo_name', 10),
        'telephone', v_info ->> 'phone'),
      'recipient', case cr ->> 'type'
        when 'PHONE' then jsonb_build_object('type', 'PHONE', 'value', cr ->> 'value', 'purpose', cr ->> 'purpose')
        else jsonb_build_object('type', 'BUSINESS_REGISTRATION_NUMBER', 'value', cr ->> 'value') end,
      'amount', jsonb_build_object('supplyAmount', (v_amt ->> 'supply')::bigint, 'vatAmount', (v_amt ->> 'vat')::bigint, 'taxFreeAmount', (v_amt ->> 'tax_free')::bigint));
    begin
      select t.status, t.body into v_status, v_resp from mall_builder_private.bolta_call(v_key, 'POST', '/v1/cashReceipts', v_body, v_ref) t;
    exception when others then
      v_status := null; v_resp := null;
    end;
    if v_status between 200 and 202 and coalesce(v_resp ->> 'issuanceKey', '') <> '' then
      v_state := 'issuing';
    elsif v_status between 400 and 499 then
      v_state := 'failed';
      v_err := case when v_status in (401, 403) then '볼타 API 키가 맞지 않습니다.' else left(coalesce(nullif(v_resp ->> 'message', ''), '볼타가 요청을 거절했습니다.'), 200) end;
    else
      v_state := 'unknown'; v_err := '볼타 응답을 받지 못했습니다. 「상태 다시 확인」을 눌러 주세요.';
    end if;
  end if;

  cr := cr || jsonb_build_object('status', v_state, 'attempt', v_attempt, 'ref', v_ref, 'issuance_key', coalesce(v_resp ->> 'issuanceKey', ''),
    'approval_no', '', 'amount', v_total, 'error', v_err, 'reissue_amount', 0, 'issue_requested_at', now());
  update public.mall_builder_orders set cash_receipt = cr where id = o.id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (o.id, o.status, o.status, auth.uid(), 'system',
    case v_state when 'issuing' then '현금영수증 발급 요청(볼타 접수) · ' || to_char(v_total, 'FM999,999,999,990') || '원'
                 when 'failed' then '현금영수증 발급 안 됨: ' || v_err else '현금영수증 발급 결과 모름(확인 필요)' end);
  return cr;
end;
$$;

-- 볼타에 전액 취소 요청(권한 검사 없음). p_reissue: 취소가 확정되면 다시 발급할 금액(0이면 안 함)
create or replace function mall_builder_private.cash_receipt_cancel(p_order_id uuid, p_reissue bigint default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  cr jsonb;
  v_key text;
  v_ref text;
  v_status integer;
  v_resp jsonb;
  v_state text;
  v_err text := '';
begin
  select * into o from public.mall_builder_orders where id = p_order_id;
  cr := o.cash_receipt;
  if cr is null then return null; end if;
  if cr ->> 'status' not in ('issued', 'issuing', 'cancel_failed') or coalesce(cr ->> 'issuance_key', '') = '' then
    -- 아직 발급 전(신청만·거절)이면 볼타에 갈 것 없이 끝
    if cr ->> 'status' in ('requested', 'failed') then
      cr := cr || jsonb_build_object('status', 'cancelled', 'error', '');
      update public.mall_builder_orders set cash_receipt = cr where id = o.id;
    elsif cr ->> 'status' in ('issued', 'cancel_failed') then
      -- 발급은 됐는데 볼타 발급 번호를 모름 → 자동 취소 불가. 조용히 「발급 완료」로 두지 않고 보이게 남김(볼타 호출 없음)
      cr := cr || jsonb_build_object('status', 'cancel_failed', 'reissue_amount', greatest(coalesce(p_reissue, 0), 0),
        'error', '볼타 발급 번호를 몰라 자동 취소하지 못했습니다. 볼타 화면에서 직접 취소해 주세요.');
      update public.mall_builder_orders set cash_receipt = cr where id = o.id;
      insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
      values (o.id, o.status, o.status, auth.uid(), 'system', '현금영수증 취소 안 됨: ' || (cr ->> 'error'));
    end if;
    -- unknown·발급 번호 없는 issuing은 그대로 둠 → 「상태 다시 확인」 때 지금 주문 상태로 맞춤
    return cr;
  end if;
  select x.bolta_api_key into v_key from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  -- 같은 발급(attempt)의 취소는 항상 같은 요청 번호: 응답이 끊겨 다시 요청해도 볼타가 같은 요청으로 보고, 409(이미 취소 요청)여도 이 번호로 결과를 조회할 수 있음
  v_ref := 'mbcrc-' || o.id || '-' || coalesce(cr ->> 'attempt', '1');
  begin
    select t.status, t.body into v_status, v_resp from mall_builder_private.bolta_call(coalesce(v_key, ''), 'POST', '/v1/cashReceipts/' || (cr ->> 'issuance_key') || '/cancellation', null, v_ref) t;
  exception when others then
    v_status := null; v_resp := null;
  end;
  if v_status between 200 and 202 then
    v_state := 'cancelling';
  elsif v_status = 409 and coalesce(v_resp ->> 'code', '') = 'CANCELLATION_ALREADY_REQUESTED' then
    v_state := 'cancelling';
  elsif v_status between 400 and 499 then
    v_state := 'cancel_failed';
    v_err := case when coalesce(v_resp ->> 'code', '') = 'ORIGINAL_ISSUANCE_PENDING' then '아직 발급 처리 중이라 취소할 수 없습니다. 잠시 뒤 「취소 다시 요청」을 눌러 주세요.'
                  else left(coalesce(nullif(v_resp ->> 'message', ''), '볼타가 취소를 거절했습니다.'), 200) end;
  else
    v_state := 'cancel_failed'; v_err := '볼타 응답을 받지 못했습니다. 「취소 다시 요청」을 눌러 주세요.';
  end if;
  cr := cr || jsonb_build_object('status', v_state, 'cancel_ref', case when v_state = 'cancelling' then v_ref else coalesce(cr ->> 'cancel_ref', '') end,
    'cancel_key', coalesce(v_resp ->> 'issuanceKey', cr ->> 'cancel_key', ''), 'reissue_amount', greatest(coalesce(p_reissue, 0), 0), 'error', v_err);
  update public.mall_builder_orders set cash_receipt = cr where id = o.id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (o.id, o.status, o.status, auth.uid(), 'system',
    case v_state when 'cancelling' then '현금영수증 취소 요청(볼타 접수)' || case when p_reissue > 0 then ' · 남은 ' || to_char(p_reissue, 'FM999,999,999,990') || '원 다시 발급 예정' else '' end
                 else '현금영수증 취소 안 됨: ' || v_err end);
  return cr;
end;
$$;

-- 유저: 신청(무통장 주문, 본인 주문만). 이미 결제 완료면 바로 발급 요청
create or replace function public.mall_builder_cash_receipt_request(p_order_id uuid, p_type text, p_value text, p_purpose text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_on boolean;
  v_val text;
  v_purpose text;
  cr jsonb;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if o.id is null or o.user_id is distinct from auth.uid() then raise exception '주문을 찾을 수 없습니다.'; end if;
  select coalesce((s.settings -> 'cash_receipt' ->> 'enabled')::boolean, false) into v_on from public.mall_builder_stores s where s.id = o.store_id;
  if not v_on then raise exception '이 쇼핑몰은 현금영수증 신청을 받지 않습니다.'; end if;
  if o.is_card then raise exception '카드 결제는 카드 매출전표가 영수증입니다.'; end if;
  if o.is_credit then raise exception '외상 주문은 세금계산서로 받아 주세요.'; end if;
  if o.tax_invoice is not null then raise exception '세금계산서를 요청한 주문은 현금영수증을 함께 받을 수 없습니다.'; end if;
  if o.status not in ('pending_payment', 'paid', 'preparing', 'shipping', 'delivered') then raise exception '지금은 현금영수증을 신청할 수 없는 주문입니다.'; end if;
  if o.cash_receipt is not null and o.cash_receipt ->> 'status' not in ('failed', 'cancelled') then raise exception '이미 현금영수증을 신청한 주문입니다.'; end if;

  if p_type = 'PHONE' then
    v_val := regexp_replace(coalesce(p_value, ''), '\D', '', 'g');
    if v_val !~ '^010\d{8}$' then raise exception '휴대폰 번호(010으로 시작하는 11자리)를 넣어 주세요.'; end if;
    v_val := substr(v_val, 1, 3) || '-' || substr(v_val, 4, 4) || '-' || substr(v_val, 8, 4);
    v_purpose := coalesce(nullif(p_purpose, ''), 'INCOME_DEDUCTION');
    if v_purpose not in ('INCOME_DEDUCTION', 'EXPENSE_PROOF') then raise exception '용도를 골라 주세요.'; end if;
  elsif p_type = 'BUSINESS_REGISTRATION_NUMBER' then
    v_val := regexp_replace(coalesce(p_value, ''), '\D', '', 'g');
    if v_val !~ '^\d{10}$' then raise exception '사업자등록번호 10자리를 넣어 주세요.'; end if;
    v_purpose := 'EXPENSE_PROOF';
  else
    raise exception '받을 방법을 골라 주세요.';
  end if;

  cr := jsonb_build_object('type', p_type, 'value', v_val, 'purpose', v_purpose, 'status', 'requested',
    'attempt', coalesce((o.cash_receipt ->> 'attempt')::integer, 0), 'error', '', 'requested_at', now());
  update public.mall_builder_orders set cash_receipt = cr where id = o.id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (o.id, o.status, o.status, auth.uid(), 'customer', '현금영수증 신청(' || case v_purpose when 'INCOME_DEDUCTION' then '소득공제' else '지출증빙' end || ')');
  if o.status <> 'pending_payment' then cr := mall_builder_private.cash_receipt_issue(o.id); end if;
  return cr;
end;
$$;

-- 결과 확인(운영사 또는 그 주문 유저). 취소가 확정되고 다시 발급할 금액이 있으면 이어서 발급 요청
create or replace function public.mall_builder_cash_receipt_recheck(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  cr jsonb;
  v_key text;
  v_ref text;
  v_status integer;
  v_resp jsonb;
  v_s text;
  v_reissue bigint;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  -- 확인이 볼타 취소·재발급까지 이어질 수 있으므로 직원은 주문 권한이 있어야 함(주문한 유저 본인은 그대로 가능)
  if o.id is null or not (o.user_id = auth.uid() or public.mall_builder_staff_can(o.store_id, 'orders')) then raise exception '주문을 찾을 수 없습니다.'; end if;
  cr := o.cash_receipt;
  if cr is null then raise exception '현금영수증 신청이 없는 주문입니다.'; end if;
  if cr ->> 'status' not in ('issuing', 'unknown', 'cancelling') then return cr; end if;
  v_ref := case when cr ->> 'status' = 'cancelling' then cr ->> 'cancel_ref' else cr ->> 'ref' end;
  select x.bolta_api_key into v_key from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  begin
    select t.status, t.body into v_status, v_resp from mall_builder_private.bolta_call(coalesce(v_key, ''), 'GET', '/v1/cashReceipts/status?clientReferenceId=' || v_ref, null, null) t;
  exception when others then
    return cr;
  end;
  if v_status <> 200 then
    if cr ->> 'status' = 'unknown' and v_status = 404 then
      cr := cr || jsonb_build_object('status', 'failed', 'error', '볼타에 접수된 기록이 없습니다. 다시 발급해 주세요.');
      update public.mall_builder_orders set cash_receipt = cr where id = o.id;
    end if;
    return cr;
  end if;
  v_s := coalesce(v_resp ->> 'status', '');
  if cr ->> 'status' = 'cancelling' then
    if v_s = 'CANCELED' then
      -- 저장해 둔 옛 금액이 아니라 지금 주문 상태로 다시 발급할 금액을 정함(취소 중에 주문이 또 바뀐 경우 되살리지 않음)
      v_reissue := mall_builder_private.cash_receipt_target(o.id);
      cr := cr || jsonb_build_object('status', 'cancelled', 'error', '');
      update public.mall_builder_orders set cash_receipt = cr where id = o.id;
      insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
      values (o.id, o.status, o.status, auth.uid(), 'system', '현금영수증 취소 완료');
      if v_reissue > 0 then cr := mall_builder_private.cash_receipt_issue(o.id, v_reissue); end if;
    elsif v_s like '%FAILED' then
      cr := cr || jsonb_build_object('status', 'cancel_failed', 'error', left(coalesce(v_resp -> 'failure' ->> 'message', v_resp -> 'failure' ->> 'code', '취소가 실패했습니다.'), 200));
      update public.mall_builder_orders set cash_receipt = cr where id = o.id;
    end if;
  else
    if v_s = 'ISSUED' then
      cr := cr || jsonb_build_object('status', 'issued', 'approval_no', coalesce(v_resp ->> 'cashReceiptApprovalNumber', ''), 'error', '', 'issued_at', now(),
        'issuance_key', coalesce(nullif(cr ->> 'issuance_key', ''), v_resp ->> 'issuanceKey', ''));
      update public.mall_builder_orders set cash_receipt = cr where id = o.id;
      insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
      values (o.id, o.status, o.status, auth.uid(), 'system', '현금영수증 발급 완료 · 승인번호 ' || coalesce(v_resp ->> 'cashReceiptApprovalNumber', ''));
      -- 결과를 기다리는 사이 주문이 취소·반품·환불됐으면 지금 주문 기준으로 맞춤(전액 취소 → 필요하면 남은 금액 다시 발급)
      v_reissue := mall_builder_private.cash_receipt_target(o.id);
      if v_reissue <> coalesce((cr ->> 'amount')::bigint, 0) then
        cr := mall_builder_private.cash_receipt_cancel(o.id, v_reissue);
      end if;
    elsif v_s like '%FAILED' then
      cr := cr || jsonb_build_object('status', 'failed', 'error', left(coalesce(v_resp -> 'failure' ->> 'message', v_resp -> 'failure' ->> 'code', '발급이 실패했습니다.'), 200));
      update public.mall_builder_orders set cash_receipt = cr where id = o.id;
    elsif v_s in ('CANCELED', 'EXTERNALLY_CANCELED') then
      cr := cr || jsonb_build_object('status', 'cancelled', 'error', case when v_s = 'EXTERNALLY_CANCELED' then '볼타 밖(홈택스 등)에서 취소되었습니다.' else '' end);
      update public.mall_builder_orders set cash_receipt = cr where id = o.id;
    elsif cr ->> 'status' = 'unknown' then
      cr := cr || jsonb_build_object('status', 'issuing', 'error', '', 'issuance_key', coalesce(nullif(cr ->> 'issuance_key', ''), v_resp ->> 'issuanceKey', ''));
      update public.mall_builder_orders set cash_receipt = cr where id = o.id;
    end if;
  end if;
  return cr;
end;
$$;

-- 운영사: 다시 발급(실패 뒤) · 취소 다시 요청 · 금액이 바뀐 주문 「취소 후 다시 발급」
create or replace function public.mall_builder_cash_receipt_staff(p_order_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  cr jsonb;
  v_amt bigint;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if o.id is null or not public.mall_builder_staff_can(o.store_id, 'orders') then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  cr := o.cash_receipt;
  if cr is null then raise exception '현금영수증 신청이 없는 주문입니다.'; end if;
  if p_action = 'retry' then
    if cr ->> 'status' <> 'failed' then raise exception '실패한 경우에만 다시 발급할 수 있습니다.'; end if;
    if o.status not in ('paid', 'preparing', 'shipping', 'delivered') then raise exception '결제 완료된 주문만 발급할 수 있습니다.'; end if;
    return mall_builder_private.cash_receipt_issue(o.id);
  elsif p_action = 'cancel_retry' then
    if cr ->> 'status' <> 'cancel_failed' then raise exception '취소가 실패한 경우에만 다시 요청할 수 있습니다.'; end if;
    return mall_builder_private.cash_receipt_cancel(o.id, mall_builder_private.cash_receipt_target(o.id));
  elsif p_action = 'reissue' then
    if cr ->> 'status' <> 'issued' then raise exception '발급 완료된 현금영수증만 고쳐 발급할 수 있습니다.'; end if;
    v_amt := (mall_builder_private.cash_receipt_amount(o.id) ->> 'total')::bigint;
    if v_amt = coalesce((cr ->> 'amount')::bigint, 0) then raise exception '금액이 바뀌지 않았습니다.'; end if;
    return mall_builder_private.cash_receipt_cancel(o.id, v_amt);
  end if;
  raise exception '할 일을 골라 주세요.';
end;
$$;

-- 자동 처리: 입금 확인 → 발급, 취소·반품 → 전액 취소(반품비 남으면 취소 확정 뒤 그 금액 다시 발급)
create or replace function mall_builder_private.orders_cash_receipt_auto()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_left bigint;
begin
  if new.cash_receipt is null or new.status = old.status then return null; end if;
  if old.status = 'pending_payment' and new.status = 'paid' and new.cash_receipt ->> 'status' = 'requested' then
    perform mall_builder_private.cash_receipt_issue(new.id);
  elsif new.status in ('cancelled', 'returned') and old.status not in ('cancelled', 'returned') then
    v_left := case when new.status = 'returned' then greatest(new.total - new.refund_amount, 0) else 0 end;
    perform mall_builder_private.cash_receipt_cancel(new.id, v_left);
  end if;
  return null;
end;
$$;
drop trigger if exists mall_builder_orders_cash_receipt_auto on public.mall_builder_orders;
create trigger mall_builder_orders_cash_receipt_auto after update of status on public.mall_builder_orders
  for each row execute function mall_builder_private.orders_cash_receipt_auto();

-- 세금계산서와 현금영수증 동시 요청 막기(현금영수증이 취소·거절이면 세금계산서 가능)
create or replace function mall_builder_private.orders_receipt_one_kind()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.tax_invoice is not null and old.tax_invoice is null and new.cash_receipt is not null and new.cash_receipt ->> 'status' not in ('failed', 'cancelled') then
    raise exception '현금영수증을 신청한 주문은 세금계산서를 함께 요청할 수 없습니다.';
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_receipt_one_kind on public.mall_builder_orders;
create trigger mall_builder_orders_receipt_one_kind before update of tax_invoice on public.mall_builder_orders
  for each row execute function mall_builder_private.orders_receipt_one_kind();

revoke all on function mall_builder_private.cash_receipt_amount(uuid) from public;
revoke all on function mall_builder_private.cash_receipt_target(uuid) from public;
revoke all on function mall_builder_private.cash_receipt_issue(uuid, bigint) from public;
revoke all on function mall_builder_private.cash_receipt_cancel(uuid, bigint) from public;
revoke all on function public.mall_builder_cash_receipt_settings_save(uuid, boolean) from public, anon;
revoke all on function public.mall_builder_cash_receipt_request(uuid, text, text, text) from public, anon;
revoke all on function public.mall_builder_cash_receipt_recheck(uuid) from public, anon;
revoke all on function public.mall_builder_cash_receipt_staff(uuid, text) from public, anon;
grant execute on function public.mall_builder_cash_receipt_settings_save(uuid, boolean) to authenticated;
grant execute on function public.mall_builder_cash_receipt_request(uuid, text, text, text) to authenticated;
grant execute on function public.mall_builder_cash_receipt_recheck(uuid) to authenticated;
grant execute on function public.mall_builder_cash_receipt_staff(uuid, text) to authenticated;
-- ===== 0100_cash_receipts.sql 원문 끝 =====

-- [기록] 이전 적용(0097~0099)과 같은 모양: version(UTC 시각 숫자)·name만
insert into supabase_migrations.schema_migrations (version, name)
select to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), 'mall_builder_0100_cash_receipts'
where not exists (select 1 from supabase_migrations.schema_migrations where name = 'mall_builder_0100_cash_receipts');

commit;
