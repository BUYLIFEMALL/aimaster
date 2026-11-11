-- AI 쇼핑몰 빌더 F17 — 세금계산서 발행 요청 기록
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경, 함수에 지우기 문장 없음(docs/mall/LESSONS_LEARNED.md)
-- 주문 함수는 건드리지 않는다: 주문 직후 서버 동작이 요청 함수를 부르고, 주문 상세에서 나중에 요청할 수도 있다.

alter table public.mall_builder_orders add column if not exists tax_invoice jsonb;

-- 손님: 내 주문에 세금계산서 발행 요청(승인 사업자, 취소·반품 아님, 한 번만). 사업자 정보는 가입 정보로
create or replace function public.mall_builder_request_tax_invoice(p_order_id uuid, p_email text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.mall_builder_orders%rowtype;
  v_c public.mall_builder_store_customers%rowtype;
  v_inv jsonb;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_order from public.mall_builder_orders o where o.id = p_order_id for update;
  if not found or v_order.user_id <> auth.uid() then raise exception '주문을 찾을 수 없습니다.'; end if;
  if v_order.tax_invoice is not null then raise exception '이미 세금계산서를 요청한 주문입니다.'; end if;
  if v_order.status in ('cancelled', 'returned', 'cancel_requested', 'return_requested') then raise exception '취소·반품 중인 주문은 요청할 수 없습니다.'; end if;
  select * into v_c from public.mall_builder_store_customers c where c.id = v_order.customer_id;
  if not found or v_c.approval_status <> 'approved' or v_c.business_no is null then raise exception '승인된 사업자 회원만 세금계산서를 요청할 수 있습니다.'; end if;
  if coalesce(p_email, '') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(p_email) > 100 then raise exception '메일 주소를 확인해 주세요.'; end if;
  v_inv := jsonb_build_object('status', 'requested', 'business_no', v_c.business_no, 'company', v_c.company, 'ceo_name', v_c.ceo_name,
                              'email', btrim(p_email), 'requested_at', now());
  update public.mall_builder_orders set tax_invoice = v_inv where id = p_order_id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (p_order_id, v_order.status, v_order.status, auth.uid(), 'customer', '세금계산서 발행 요청(' || btrim(p_email) || ')');
  return v_inv;
end;
$$;

-- 운영자: 발행 완료로 표시(실제 발행은 홈택스 등에서)
create or replace function public.mall_builder_mark_tax_invoice_issued(p_order_id uuid, p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.mall_builder_orders%rowtype;
  v_inv jsonb;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_order from public.mall_builder_orders o where o.id = p_order_id for update;
  if not found or not public.mall_builder_is_store_staff(v_order.store_id) then raise exception '이 주문을 고칠 권한이 없습니다.'; end if;
  if v_order.tax_invoice is null then raise exception '세금계산서 요청이 없는 주문입니다.'; end if;
  if v_order.tax_invoice ->> 'status' = 'issued' then raise exception '이미 발행 완료로 표시했습니다.'; end if;
  if char_length(coalesce(p_note, '')) > 200 then raise exception '메모는 200자 이내로 입력해 주세요.'; end if;
  v_inv := v_order.tax_invoice || jsonb_build_object('status', 'issued', 'issued_at', now(), 'note', coalesce(btrim(p_note), ''));
  update public.mall_builder_orders set tax_invoice = v_inv where id = p_order_id;
  insert into public.mall_builder_order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (p_order_id, v_order.status, v_order.status, auth.uid(), 'staff', '세금계산서 발행 완료' || case when coalesce(btrim(p_note), '') <> '' then ' — ' || btrim(p_note) else '' end);
  return v_inv;
end;
$$;
