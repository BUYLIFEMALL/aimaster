-- AI 쇼핑몰 빌더 D19 — 세금계산서 실제 발행(볼타, 몰 운영자 본인 키) (플랜 docs/PLAN_20261109_TAX_INVOICE_ISSUE.md)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만(지우기·권한 회수 없음).
-- 결정(주인님 2026-11-09): 볼타 운영자 본인 키 · 손님 요청 뒤 운영자 「발행」 버튼 · 취소·부분 취소는 「수정 발행」 버튼 · 과세 품목만.
-- 볼타 API(2026-11-09 docs.bolta.io 확인): POST /v1/taxInvoices/issue (Basic 인증, Bolta-Client-Reference-Id 한 번만 사용),
--   GET /v1/taxInvoices/issue/status?clientReferenceId=, GET /v1/taxInvoices/{issuanceKey}(발행 완료 건·국세청 승인번호),
--   POST /v1/taxInvoices/{issuanceKey}/amend/termination | /amend/changeSupplyCost.
-- 응답을 못 받은 요청은 다시 보내지 않고 상태 조회로만 확인한다(두 번 발행 방지).
-- 카드 결제 주문은 카드 매출전표가 세금계산서를 대신하므로 발행하지 않는다.
-- 주문 tax_invoice 상태: requested(요청) → issuing(볼타 접수) → issued(발행 완료) / failed(접수 거절, 다시 발행 가능) / unknown(응답 못 받음, 확인 필요)

-- ── 0039a 칸·설정 ──
alter table public.mall_builder_store_scheduler_secrets add column if not exists bolta_api_key text not null default '';

-- 세금계산서 설정(공급자 담당자 메일·업태·종목) — 운영자만
create table if not exists public.mall_builder_store_tax_settings (
  store_id uuid primary key references public.mall_builder_stores (id) on delete cascade,
  manager_email text not null default '' check (char_length(manager_email) <= 40),
  business_type text not null default '' check (char_length(business_type) <= 100),
  business_item text not null default '' check (char_length(business_item) <= 100),
  updated_at timestamptz not null default now()
);
alter table public.mall_builder_store_tax_settings enable row level security;
create policy mall_builder_store_tax_settings_read on public.mall_builder_store_tax_settings for select using (public.mall_builder_is_store_staff(store_id));

create or replace function mall_builder_private.bolta_call(p_key text, p_method text, p_path text, p_body jsonb, p_ref text)
returns table (status integer, body jsonb) language plpgsql set search_path = '' as $$
declare
  r extensions.http_response;
  h extensions.http_header[];
begin
  h := array[extensions.http_header('Authorization', 'Basic ' || replace(encode(convert_to(p_key || ':', 'UTF8'), 'base64'), E'\n', ''))];
  if p_ref is not null then h := h || extensions.http_header('Bolta-Client-Reference-Id', p_ref); end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '30000');
  select * into r from extensions.http((p_method, 'https://xapi.bolta.io' || p_path, h, 'application/json',
    case when p_body is null then null else p_body::text end)::extensions.http_request);
  return query select r.status,
    case when coalesce(r.content, '') ~ '^\s*[\{\[]' then r.content::jsonb else jsonb_build_object('raw', left(coalesce(r.content, ''), 200)) end;
end;
$$;

-- 운영자: 저장. 키가 null이면 그대로, ''이면 비움
create or replace function public.mall_builder_tax_settings_save(p_store_id uuid, p_manager_email text, p_business_type text, p_business_item text, p_api_key text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_mail text := btrim(coalesce(p_manager_email, ''));
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if v_mail <> '' and (char_length(v_mail) > 40 or v_mail !~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$') then
    raise exception '담당자 메일을 확인해 주세요(영문 메일, 40자 이내).';
  end if;
  if p_api_key is not null and btrim(p_api_key) <> '' and btrim(p_api_key) !~ '^(test|live)_[A-Za-z0-9_-]{6,200}$' then
    raise exception '볼타 API 키는 test_ 또는 live_로 시작하는 키를 넣어 주세요.';
  end if;
  insert into public.mall_builder_store_scheduler_secrets (store_id, bolta_api_key) values (p_store_id, coalesce(btrim(p_api_key), ''))
    on conflict (store_id) do update set
      bolta_api_key = case when p_api_key is null then public.mall_builder_store_scheduler_secrets.bolta_api_key else btrim(p_api_key) end,
      updated_at = now();
  insert into public.mall_builder_store_tax_settings (store_id, manager_email, business_type, business_item)
  values (p_store_id, v_mail, left(btrim(coalesce(p_business_type, '')), 100), left(btrim(coalesce(p_business_item, '')), 100))
    on conflict (store_id) do update set manager_email = excluded.manager_email, business_type = excluded.business_type,
      business_item = excluded.business_item, updated_at = now();
end;
$$;

-- 운영자: 키 있음·종류만(값은 돌려주지 않음)
create or replace function public.mall_builder_tax_key_status(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  select x.bolta_api_key into v from public.mall_builder_store_scheduler_secrets x where x.store_id = p_store_id;
  return jsonb_build_object('has_key', coalesce(v, '') <> '', 'mode', case when coalesce(v, '') = '' then '' else split_part(v, '_', 1) end);
end;
$$;

-- 운영자: 연결 시험(발급자 목록 조회 — 포인트 차감 없음). 공동인증서 등록 여부도 함께 알려 준다
create or replace function public.mall_builder_tax_key_test(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_key text; v_status integer; v_body jsonb;
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  select x.bolta_api_key into v_key from public.mall_builder_store_scheduler_secrets x where x.store_id = p_store_id;
  if coalesce(v_key, '') = '' then raise exception '볼타 API 키를 먼저 저장해 주세요.'; end if;
  begin
    select t.status, t.body into v_status, v_body from mall_builder_private.bolta_call(v_key, 'GET', '/v1/issuers', null, null) t;
  exception when others then
    return jsonb_build_object('ok', false, 'message', '볼타에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
  end;
  if v_status = 200 then return jsonb_build_object('ok', true, 'issuers', v_body); end if;
  return jsonb_build_object('ok', false, 'status', v_status, 'message',
    case when v_status in (401, 403) then '볼타 API 키가 맞지 않습니다. 키를 다시 확인해 주세요.' else coalesce(nullif(v_body ->> 'message', ''), '키를 확인해 주세요.') end);
end;
$$;

-- ── 0039b 품목 계산 ──
-- 과세 품목(남은 수량) + 배송비(과세)에 쿠폰·포인트 할인을 비율로 나눠 반영. 품목마다 세액 = 반올림(합계 ÷ 11), 공급가액 = 합계 − 세액.
-- 품목이 16개를 넘거나 할인 뒤 0원 이하인 품목이 생기면 「첫 품목 외 N건」 한 줄로 묶는다
create or replace function mall_builder_private.tax_invoice_lines(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_today text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD');
  v_lines jsonb := '[]'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_taxable bigint := 0;
  v_exempt integer := 0;
  v_base_t bigint;
  v_base_all bigint;
  v_disc_t bigint := 0;
  v_used bigint := 0;
  v_net bigint;
  v_total bigint := 0;
  v_supply bigint := 0;
  v_tax bigint := 0;
  v_collapse boolean := false;
  v_n integer;
  v_i integer := 0;
  l jsonb;
  r record;
begin
  select * into o from public.mall_builder_orders where id = p_order_id;
  for r in
    select i.name_snapshot, i.option_snapshot, i.unit_price, (i.qty - i.cancelled_qty) as q, coalesce(p.tax_type, 'taxable') as tax_type
      from public.mall_builder_order_items i left join public.mall_builder_products p on p.id = i.product_id
     where i.order_id = p_order_id and i.qty > i.cancelled_qty
     order by i.unit_price * (i.qty - i.cancelled_qty) desc
  loop
    if r.tax_type = 'exempt' then v_exempt := v_exempt + 1; continue; end if;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('name', left(r.name_snapshot || case when r.option_snapshot <> '' then ' (' || r.option_snapshot || ')' else '' end, 100),
      'qty', r.q, 'unit', r.unit_price, 'gross', r.unit_price * r.q));
    v_taxable := v_taxable + r.unit_price * r.q;
  end loop;
  if o.shipping_fee > 0 and v_taxable > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('name', '배송비', 'qty', 1, 'unit', o.shipping_fee, 'gross', o.shipping_fee));
  end if;
  v_base_t := v_taxable + case when v_taxable > 0 then o.shipping_fee else 0 end;
  v_base_all := o.subtotal + o.shipping_fee;
  if v_base_t > 0 and v_base_all > 0 and (o.coupon_discount + o.point_used) > 0 then
    v_disc_t := round((o.coupon_discount + o.point_used)::numeric * v_base_t / v_base_all)::bigint;
  end if;
  v_n := jsonb_array_length(v_lines);
  for l in select * from jsonb_array_elements(v_lines) loop
    v_i := v_i + 1;
    -- 할인 나누기: 마지막 품목이 나머지를 받는다(합이 정확히 맞게)
    v_net := (l ->> 'gross')::bigint - case when v_i = v_n then v_disc_t - v_used else floor(v_disc_t::numeric * (l ->> 'gross')::bigint / v_base_t)::bigint end;
    v_used := v_used + ((l ->> 'gross')::bigint - v_net);
    if v_net < 1 then v_collapse := true; end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'date', v_today, 'name', l ->> 'name', 'quantity', (l ->> 'qty')::integer,
      'unitPrice', case when v_disc_t = 0 then (l ->> 'unit')::bigint else null end,
      'supplyCost', v_net - round(v_net / 11.0)::bigint, 'tax', round(v_net / 11.0)::bigint));
    v_total := v_total + v_net;
  end loop;
  if v_n > 16 or v_collapse then
    v_items := jsonb_build_array(jsonb_build_object('date', v_today,
      'name', left((v_lines -> 0 ->> 'name') || case when v_n > 1 then ' 외 ' || (v_n - 1) || '건' else '' end, 100),
      'quantity', null, 'unitPrice', null, 'supplyCost', v_total - round(v_total / 11.0)::bigint, 'tax', round(v_total / 11.0)::bigint));
  end if;
  select coalesce(sum((x ->> 'supplyCost')::bigint), 0), coalesce(sum((x ->> 'tax')::bigint), 0) into v_supply, v_tax from jsonb_array_elements(v_items) x;
  return jsonb_build_object('items', v_items, 'total', v_total, 'supply', v_supply, 'tax', v_tax, 'exempt_lines', v_exempt, 'date', v_today);
end;
$$;

-- 운영자: 발행 전 미리보기
create or replace function public.mall_builder_tax_invoice_preview(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare o public.mall_builder_orders%rowtype;
begin
  select * into o from public.mall_builder_orders where id = p_order_id;
  if o.id is null or not public.mall_builder_is_store_staff(o.store_id) then raise exception '이 주문을 볼 권한이 없습니다.'; end if;
  return mall_builder_private.tax_invoice_lines(p_order_id);
end;
$$;

-- ── 0039c 발행·상태 확인·수정 발행 ──
create or replace function public.mall_builder_tax_invoice_issue(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_key text;
  v_ts public.mall_builder_store_tax_settings%rowtype;
  v_info jsonb;
  v_inv jsonb;
  v_lines jsonb;
  v_body jsonb;
  v_ref text;
  v_attempt integer;
  v_status integer;
  v_resp jsonb;
  v_mail text;
  v_state text;
  v_err text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if o.id is null or not public.mall_builder_is_store_staff(o.store_id) then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  v_inv := o.tax_invoice;
  if v_inv is null then raise exception '손님의 세금계산서 요청이 없는 주문입니다.'; end if;
  if v_inv ->> 'status' in ('issuing', 'issued') then raise exception '이미 발행한 주문입니다. 「상태 다시 확인」을 눌러 주세요.'; end if;
  if v_inv ->> 'status' = 'unknown' then raise exception '지난 발행 요청의 결과를 아직 모릅니다. 두 번 발행되지 않도록 먼저 「상태 다시 확인」을 눌러 주세요.'; end if;
  if o.is_card then raise exception '카드 결제 주문은 카드 매출전표가 세금계산서를 대신합니다(부가가치세법). 발행하지 않습니다.'; end if;
  if o.status in ('cancelled', 'returned', 'cancel_requested', 'return_requested') then raise exception '취소·반품 중인 주문은 발행할 수 없습니다.'; end if;
  select x.bolta_api_key into v_key from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  if coalesce(v_key, '') = '' then raise exception '설정 「세금계산서 발행(볼타)」에 볼타 API 키를 먼저 넣어 주세요.'; end if;
  select * into v_ts from public.mall_builder_store_tax_settings t where t.store_id = o.store_id;
  select coalesce(s.business_info, '{}'::jsonb) into v_info from public.mall_builder_stores s where s.id = o.store_id;
  v_mail := coalesce(nullif(v_ts.manager_email, ''), v_info ->> 'email', '');
  if regexp_replace(coalesce(v_info ->> 'business_no', ''), '\D', '', 'g') !~ '^\d{10}$' or coalesce(v_info ->> 'company_name', '') = '' or coalesce(v_info ->> 'ceo_name', '') = '' then
    raise exception '쇼핑몰 정보에 상호·대표자·사업자등록번호를 먼저 넣어 주세요.';
  end if;
  if v_mail = '' or char_length(v_mail) > 40 then raise exception '설정 「세금계산서 발행(볼타)」에 담당자 메일(40자 이내)을 넣어 주세요.'; end if;
  if char_length(coalesce(v_inv ->> 'email', '')) > 40 then raise exception '손님이 적은 받을 메일이 40자를 넘어 볼타로 보낼 수 없습니다. 손님에게 짧은 메일을 받아 홈택스에서 발행해 주세요.'; end if;
  v_lines := mall_builder_private.tax_invoice_lines(p_order_id);
  if (v_lines ->> 'total')::bigint < 1 or jsonb_array_length(v_lines -> 'items') = 0 then raise exception '세금계산서로 발행할 과세 금액이 없습니다(면세 품목은 홈택스에서 계산서로 발행해 주세요).'; end if;

  v_attempt := coalesce((v_inv ->> 'attempt')::integer, 0) + 1;
  v_ref := 'mb-' || o.id || '-' || v_attempt;
  v_body := jsonb_build_object(
    'date', v_lines ->> 'date',
    'purpose', case when o.is_credit or o.status = 'pending_payment' then 'CLAIM' else 'RECEIPT' end,
    'taxType', 'TAXABLE',
    'supplier', jsonb_strip_nulls(jsonb_build_object(
      'identificationNumber', regexp_replace(v_info ->> 'business_no', '\D', '', 'g'),
      'organizationName', left(v_info ->> 'company_name', 70), 'representativeName', left(v_info ->> 'ceo_name', 30),
      'address', nullif(left(coalesce(v_info ->> 'address', ''), 150), ''),
      'businessType', nullif(v_ts.business_type, ''), 'businessItem', nullif(v_ts.business_item, ''),
      'manager', jsonb_build_object('email', v_mail))),
    'supplied', jsonb_build_object(
      'identificationNumber', regexp_replace(coalesce(v_inv ->> 'business_no', ''), '\D', '', 'g'),
      'organizationName', left(coalesce(nullif(v_inv ->> 'company', ''), '(상호 없음)'), 70),
      'representativeName', left(coalesce(nullif(v_inv ->> 'ceo_name', ''), '(대표자 없음)'), 30),
      'managers', jsonb_build_array(jsonb_build_object('email', v_inv ->> 'email'))),
    'items', (select jsonb_agg(jsonb_strip_nulls(x)) from jsonb_array_elements(v_lines -> 'items') x),
    'description', left('주문 ' || o.order_no, 150));

  begin
    select t.status, t.body into v_status, v_resp from mall_builder_private.bolta_call(v_key, 'POST', '/v1/taxInvoices/issue', v_body, v_ref) t;
  exception when others then
    v_status := null; v_resp := null;
  end;
  if v_status = 200 and coalesce(v_resp ->> 'issuanceKey', '') <> '' then
    v_state := 'issuing'; v_err := '';
  elsif v_status between 400 and 499 then
    v_state := 'failed';
    v_err := case when v_status in (401, 403) then '볼타 API 키가 맞지 않습니다. 설정에서 키를 확인해 주세요.'
                  else left(coalesce(nullif(v_resp ->> 'message', ''), nullif(v_resp ->> 'raw', ''), '볼타가 요청을 거절했습니다.'), 200) end;
  else
    v_state := 'unknown'; v_err := '볼타 응답을 받지 못했습니다. 「상태 다시 확인」으로 결과를 확인해 주세요.';
  end if;
  v_inv := v_inv || jsonb_build_object('status', v_state, 'provider', 'bolta', 'attempt', v_attempt, 'ref', v_ref,
    'issuance_key', coalesce(v_resp ->> 'issuanceKey', ''), 'error', v_err, 'mode', split_part(v_key, '_', 1),
    'amount', (v_lines ->> 'total')::bigint, 'supply', (v_lines ->> 'supply')::bigint, 'tax', (v_lines ->> 'tax')::bigint,
    'requested_issue_at', now());
  update public.mall_builder_orders set tax_invoice = v_inv where id = p_order_id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (p_order_id, o.status, o.status, auth.uid(), 'staff',
    case v_state when 'issuing' then '세금계산서 발행 요청(볼타 접수) · 공급가액 ' || to_char((v_lines ->> 'supply')::bigint, 'FM999,999,999,990') || '원 · 세액 ' || to_char((v_lines ->> 'tax')::bigint, 'FM999,999,999,990') || '원'
                 when 'failed' then '세금계산서 발행 거절: ' || v_err
                 else '세금계산서 발행 결과 모름(확인 필요)' end);
  return v_inv;
end;
$$;

-- 운영자: 상태 다시 확인 — 관리번호로 접수 여부, 발행 식별번호로 발행 완료(국세청 승인번호) 확인. 이 함수는 발행 요청을 다시 보내지 않는다
create or replace function public.mall_builder_tax_invoice_recheck(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_inv jsonb;
  v_key text;
  v_status integer;
  v_resp jsonb;
  v_ik text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if o.id is null or not public.mall_builder_is_store_staff(o.store_id) then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  v_inv := o.tax_invoice;
  if v_inv is null or coalesce(v_inv ->> 'provider', '') <> 'bolta' then raise exception '볼타로 발행 요청한 주문이 아닙니다.'; end if;
  select x.bolta_api_key into v_key from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  if coalesce(v_key, '') = '' then raise exception '볼타 API 키가 없습니다.'; end if;
  v_ik := coalesce(v_inv ->> 'issuance_key', '');
  begin
    if v_ik = '' then
      select t.status, t.body into v_status, v_resp from mall_builder_private.bolta_call(v_key, 'GET', '/v1/taxInvoices/issue/status?clientReferenceId=' || (v_inv ->> 'ref'), null, null) t;
      if v_status = 200 and coalesce(v_resp ->> 'issuanceKey', '') <> '' then
        v_ik := v_resp ->> 'issuanceKey';
        v_inv := v_inv || jsonb_build_object('status', 'issuing', 'issuance_key', v_ik, 'error', '', 'bolta_message', coalesce(v_resp ->> 'message', ''));
      elsif v_status = 400 then
        -- 볼타가 그 관리번호를 받은 적이 없다 → 발행되지 않음. 다시 발행할 수 있다(새 관리번호)
        v_inv := v_inv || jsonb_build_object('status', 'failed', 'error', '볼타가 받지 않은 요청입니다. 다시 발행할 수 있습니다.');
      end if;
    end if;
    if v_ik <> '' then
      select t.status, t.body into v_status, v_resp from mall_builder_private.bolta_call(v_key, 'GET', '/v1/taxInvoices/' || v_ik, null, null) t;
      if v_status = 200 and coalesce(v_resp ->> 'ntsTransactionId', '') <> '' then
        v_inv := v_inv || jsonb_build_object('status', 'issued', 'issued_at', coalesce(v_resp ->> 'issuedAt', now()::text), 'nts_id', v_resp ->> 'ntsTransactionId', 'error', '');
      elsif v_inv ->> 'status' = 'unknown' then
        v_inv := v_inv || jsonb_build_object('status', 'issuing');
      end if;
    end if;
  exception when others then
    return v_inv || jsonb_build_object('check_error', '볼타에 연결하지 못했습니다. 잠시 뒤 다시 확인해 주세요.');
  end;
  if v_inv is distinct from o.tax_invoice then
    update public.mall_builder_orders set tax_invoice = v_inv where id = p_order_id;
    if v_inv ->> 'status' = 'issued' and o.tax_invoice ->> 'status' <> 'issued' then
      insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
      values (p_order_id, o.status, o.status, auth.uid(), 'staff', '세금계산서 발행 완료(국세청 승인번호 ' || (v_inv ->> 'nts_id') || ')');
    end if;
  end if;
  return v_inv;
end;
$$;

-- 운영자: 수정 발행 — 취소·반품 완료면 계약 해제(전액 상계), 아니면 줄어든 금액만큼 공급가액 변동(음수 품목)
create or replace function public.mall_builder_tax_invoice_amend(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype;
  v_inv jsonb;
  v_key text;
  v_kind text;
  v_lines jsonb;
  v_body jsonb;
  v_path text;
  v_ref text;
  v_n integer;
  v_status integer;
  v_resp jsonb;
  v_dsupply bigint;
  v_dtax bigint;
  v_today text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD');
  v_entry jsonb;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into o from public.mall_builder_orders where id = p_order_id for update;
  if o.id is null or not public.mall_builder_is_store_staff(o.store_id) then raise exception '이 주문을 바꿀 권한이 없습니다.'; end if;
  v_inv := o.tax_invoice;
  if v_inv is null or v_inv ->> 'status' <> 'issued' or coalesce(v_inv ->> 'issuance_key', '') = '' then raise exception '볼타로 발행 완료된 세금계산서만 수정 발행할 수 있습니다.'; end if;
  if coalesce(v_inv ->> 'terminated', '') = 'true' then raise exception '이미 전액 상계 처리한 세금계산서입니다.'; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(v_inv -> 'amendments', '[]'::jsonb)) a where a ->> 'status' = 'unknown') then
    raise exception '결과를 모르는 수정 발행이 있습니다. 볼타 화면에서 먼저 확인해 주세요.';
  end if;
  select x.bolta_api_key into v_key from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  if coalesce(v_key, '') = '' then raise exception '볼타 API 키가 없습니다.'; end if;

  if o.status in ('cancelled', 'returned') then
    v_kind := 'termination';
    v_path := '/v1/taxInvoices/' || (v_inv ->> 'issuance_key') || '/amend/termination';
    v_body := jsonb_build_object('date', v_today);
    v_dsupply := -(v_inv ->> 'supply')::bigint; v_dtax := -(v_inv ->> 'tax')::bigint;
  else
    v_lines := mall_builder_private.tax_invoice_lines(p_order_id);
    v_dsupply := (v_lines ->> 'supply')::bigint - (v_inv ->> 'supply')::bigint;
    v_dtax := (v_lines ->> 'tax')::bigint - (v_inv ->> 'tax')::bigint;
    if v_dsupply >= 0 and v_dtax >= 0 then raise exception '발행한 금액보다 줄어든 금액이 없어 수정 발행할 것이 없습니다.'; end if;
    v_kind := 'changeSupplyCost';
    v_path := '/v1/taxInvoices/' || (v_inv ->> 'issuance_key') || '/amend/changeSupplyCost';
    v_body := jsonb_build_object('date', v_today, 'taxType', 'TAXABLE',
      'items', jsonb_build_array(jsonb_build_object('date', v_today, 'name', '부분 취소', 'supplyCost', v_dsupply, 'tax', v_dtax)));
  end if;
  v_n := jsonb_array_length(coalesce(v_inv -> 'amendments', '[]'::jsonb)) + 1;
  v_ref := 'mb-' || o.id || '-a' || v_n;
  begin
    select t.status, t.body into v_status, v_resp from mall_builder_private.bolta_call(v_key, 'POST', v_path, v_body, v_ref) t;
  exception when others then
    v_status := null; v_resp := null;
  end;
  if v_status between 400 and 499 then
    raise exception '볼타가 수정 발행을 거절했습니다: %', left(coalesce(v_resp ->> 'message', v_resp ->> 'raw', ''), 200);
  end if;
  v_entry := jsonb_build_object('kind', v_kind, 'ref', v_ref, 'at', now(), 'supply_diff', v_dsupply, 'tax_diff', v_dtax,
    'status', case when v_status = 200 then 'requested' else 'unknown' end, 'issuance_key', coalesce(v_resp ->> 'issuanceKey', ''));
  v_inv := v_inv || jsonb_build_object('amendments', coalesce(v_inv -> 'amendments', '[]'::jsonb) || jsonb_build_array(v_entry));
  if v_status = 200 then
    v_inv := v_inv || jsonb_build_object('supply', (v_inv ->> 'supply')::bigint + v_dsupply, 'tax', (v_inv ->> 'tax')::bigint + v_dtax,
      'amount', (v_inv ->> 'amount')::bigint + v_dsupply + v_dtax) || case when v_kind = 'termination' then jsonb_build_object('terminated', true) else '{}'::jsonb end;
  end if;
  update public.mall_builder_orders set tax_invoice = v_inv where id = p_order_id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (p_order_id, o.status, o.status, auth.uid(), 'staff',
    case when v_status = 200 then '수정 세금계산서 발행 요청(' || case v_kind when 'termination' then '계약 해제·전액 상계' else '공급가액 ' || to_char(v_dsupply, 'FM999,999,999,990') || '원 · 세액 ' || to_char(v_dtax, 'FM999,999,999,990') || '원' end || ')'
         else '수정 세금계산서 결과 모름 — 볼타 화면에서 확인 필요' end);
  return v_inv;
end;
$$;
