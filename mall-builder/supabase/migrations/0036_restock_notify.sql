-- AI 쇼핑몰 빌더 D16 — 재입고 알림 신청(플랜 docs/PLAN_20261109_RESTOCK_NOTIFY.md)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(drop·revoke·delete 없음 — 확인 창 방지)
-- 결정(2026-11-09 주인님): 회원+비회원 신청 / 문자+메일 / 대기 90일 뒤 만료(끝난 신청의 번호·메일은 30일 뒤 지움) / 재입고 즉시 자동 발송
-- 방식: 품절 상품(옵션)에 손님이 신청 → 재고가 다시 생기는 순간 DB 트리거가 기존 알림 대기 줄(0025·0026)에 넣고,
--       기존 1분 작업(/api/cron/deposit-expire)이 문자·메일로 보낸다. 문구 속 {{site}}는 실행 주소가 사이트 주소로 바꾼다.

-- ── 0036a ── 표·칸 (추가만)
create table if not exists public.mall_builder_restock_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  variant_id uuid references public.mall_builder_product_variants (id) on delete cascade, -- 옵션 없는 상품·상품 전체 품절은 null
  user_id uuid references auth.users (id) on delete set null,                             -- 비회원은 null
  phone text not null default '',   -- 숫자만. 끝난 신청은 30일 뒤 ''
  email text not null default '',   -- 회원 메일(비회원은 ''). 끝난 신청은 30일 뒤 ''
  -- waiting 대기 · notified 알림 보냄 · cancelled 취소 · expired 90일 지나 만료
  status text not null default 'waiting' check (status in ('waiting','notified','cancelled','expired')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
alter table public.mall_builder_restock_requests enable row level security;
-- 보기: 그 몰 운영자, 또는 신청한 회원 본인. 쓰기는 함수로만
create policy "mall_builder_restock_requests_read" on public.mall_builder_restock_requests
  for select using (public.mall_builder_is_store_staff(store_id) or user_id = (select auth.uid()));
-- 같은 상품(옵션)·같은 번호는 대기 중 1건만
create unique index if not exists mall_builder_restock_waiting_once on public.mall_builder_restock_requests
  (product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), phone) where status = 'waiting';
create index if not exists mall_builder_restock_requests_store on public.mall_builder_restock_requests (store_id, status, created_at);
create index if not exists mall_builder_restock_requests_product on public.mall_builder_restock_requests (product_id, status);
create index if not exists mall_builder_restock_requests_user on public.mall_builder_restock_requests (user_id) where user_id is not null;

-- 재입고 알림 켜기(문자·메일 따로). 기존 종류 목록 제약을 바꾸지 않으려고 칸을 따로 둔다
alter table public.mall_builder_store_notify_settings add column if not exists restock_sms boolean not null default false;
alter table public.mall_builder_store_notify_settings add column if not exists restock_email boolean not null default false;

-- 대기 줄: 신청 1건당 채널별 한 번만
alter table public.mall_builder_notifications add column if not exists restock_request_id uuid references public.mall_builder_restock_requests (id) on delete set null;
create unique index if not exists mall_builder_notifications_restock_once on public.mall_builder_notifications (restock_request_id, channel)
  where restock_request_id is not null;

-- ── 0036b ── 함수 (함수 정의만 추가. 지금 지워지는 데이터는 없다)

-- 신청이 지금 주문 가능한지(재입고됐는지)
create or replace function public.mall_builder_restock_available(p_product_id uuid, p_variant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select p.status = 'on_sale' and (
      case
        when p_variant_id is not null then exists (
          select 1 from public.mall_builder_product_variants v
           where v.id = p_variant_id and v.product_id = p.id and v.is_active and (p.stock_mode = 'none' or v.stock > 0))
        when p.stock_mode = 'none' then true
        when exists (select 1 from public.mall_builder_product_variants v where v.product_id = p.id) then exists (
          select 1 from public.mall_builder_product_variants v where v.product_id = p.id and v.is_active and v.stock > 0)
        else p.stock > 0
      end)
    from public.mall_builder_products p where p.id = p_product_id), false)
$$;

-- 손님(회원·비회원): 재입고 알림 신청. 비회원도 부를 수 있다
create or replace function public.mall_builder_restock_request(
  p_store_id uuid, p_product_id uuid, p_variant_id uuid, p_phone text, p_agree boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := public.mall_builder_digits(p_phone);
  v_uid uuid := auth.uid();
  v_email text := '';
  v_id uuid;
begin
  if not coalesce(p_agree, false) then raise exception '개인정보 수집·이용에 동의해야 신청할 수 있습니다.'; end if;
  if v_phone !~ '^01[016789][0-9]{7,8}$' then raise exception '휴대폰 번호를 확인해 주세요.'; end if;
  if not exists (
    select 1 from public.mall_builder_products p join public.mall_builder_stores s on s.id = p.store_id
     where p.id = p_product_id and p.store_id = p_store_id and s.status = 'active' and p.status in ('on_sale','sold_out')) then
    raise exception '상품을 찾을 수 없습니다.';
  end if;
  if p_variant_id is not null and not exists (
    select 1 from public.mall_builder_product_variants v where v.id = p_variant_id and v.product_id = p_product_id and v.is_active) then
    raise exception '옵션을 찾을 수 없습니다.';
  end if;
  if public.mall_builder_restock_available(p_product_id, p_variant_id) then
    raise exception '지금 주문할 수 있는 상품입니다. 바로 장바구니에 담아 주세요.';
  end if;
  -- 장난 신청 막기: 한 번호는 이 몰에서 하루 20건, 이 몰 전체는 1분에 30건까지
  if (select count(*) from public.mall_builder_restock_requests r
       where r.store_id = p_store_id and r.phone = v_phone and r.created_at > now() - interval '1 day') >= 20 then
    raise exception '오늘은 더 신청할 수 없습니다. 내일 다시 신청해 주세요.';
  end if;
  if (select count(*) from public.mall_builder_restock_requests r
       where r.store_id = p_store_id and r.created_at > now() - interval '1 minute') >= 30 then
    raise exception '잠시 뒤 다시 신청해 주세요.';
  end if;
  if v_uid is not null then select lower(coalesce(u.email, '')) into v_email from auth.users u where u.id = v_uid; end if;

  insert into public.mall_builder_restock_requests (store_id, product_id, variant_id, user_id, phone, email)
    values (p_store_id, p_product_id, p_variant_id, v_uid, v_phone, coalesce(v_email, ''))
    on conflict do nothing
    returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', true, 'already', true); end if;
  return jsonb_build_object('ok', true, 'already', false);
end;
$$;

-- 회원 본인 또는 그 몰 운영자: 신청 취소
create or replace function public.mall_builder_restock_cancel(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.mall_builder_restock_requests;
begin
  select * into r from public.mall_builder_restock_requests where id = p_request_id;
  if r.id is null or auth.uid() is null or not (r.user_id = auth.uid() or public.mall_builder_is_store_staff(r.store_id)) then
    raise exception '신청을 찾을 수 없습니다.';
  end if;
  if r.status <> 'waiting' then raise exception '대기 중인 신청만 취소할 수 있습니다.'; end if;
  update public.mall_builder_restock_requests set status = 'cancelled', ended_at = now() where id = p_request_id;
end;
$$;

-- 운영자: 재입고 알림 켜기·끄기
create or replace function public.mall_builder_restock_notify_save(p_store_id uuid, p_sms boolean, p_email boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  insert into public.mall_builder_store_notify_settings (store_id, restock_sms, restock_email)
    values (p_store_id, coalesce(p_sms, false), coalesce(p_email, false))
    on conflict (store_id) do update set restock_sms = excluded.restock_sms, restock_email = excluded.restock_email, updated_at = now();
end;
$$;

-- 재고가 다시 생긴 상품(옵션)의 대기 신청을 알림 대기 줄로 보낸다.
-- 알림이 꺼져 있거나 키·자동 작업이 없으면 신청은 대기로 남는다(다음 재입고 때 다시 확인)
create or replace function public.mall_builder_restock_fire(p_product_id uuid, p_variant_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.mall_builder_products;
  ns public.mall_builder_store_notify_settings;
  v_sms boolean;
  v_mail boolean;
  v_name text;
  v_slug text;
  r record;
  v_label text;
  v_body text;
  v_link text;
begin
  select * into p from public.mall_builder_products where id = p_product_id;
  if p.id is null then return; end if;
  if not exists (select 1 from public.mall_builder_restock_requests q
                  where q.product_id = p.id and q.status = 'waiting'
                    and (p_variant_id is null or q.variant_id = p_variant_id)) then return; end if;
  select * into ns from public.mall_builder_store_notify_settings s where s.store_id = p.store_id;
  if ns.store_id is null or not (ns.restock_sms or ns.restock_email) then return; end if;
  if not exists (select 1 from public.mall_builder_store_schedulers s where s.store_id = p.store_id and s.job_id is not null and not s.paused) then return; end if;
  select ns.restock_sms and x.solapi_api_key <> '' and x.solapi_api_secret <> '' and ns.sender_phone <> '',
         ns.restock_email and x.resend_api_key <> '' and ns.email_from <> ''
    into v_sms, v_mail
    from public.mall_builder_store_scheduler_secrets x where x.store_id = p.store_id;
  if not coalesce(v_sms, false) and not coalesce(v_mail, false) then return; end if;
  select st.name, st.slug into v_name, v_slug from public.mall_builder_stores st where st.id = p.store_id;
  v_link := '{{site}}/s/' || v_slug || '/p/' || p.id;

  for r in
    select q.*, v."values" as vvalues from public.mall_builder_restock_requests q
      left join public.mall_builder_product_variants v on v.id = q.variant_id
     where q.product_id = p.id and q.status = 'waiting'
       and (p_variant_id is null or q.variant_id = p_variant_id)
     order by q.created_at
     for update of q skip locked
  loop
    continue when not public.mall_builder_restock_available(r.product_id, r.variant_id);
    v_label := p.name || coalesce(' / ' || (select string_agg(x, ' / ') from jsonb_array_elements_text(r.vvalues) x), '');
    v_body := '[' || coalesce(v_name, '쇼핑몰') || '] 기다리시던 「' || v_label || '」이(가) 다시 입고되었습니다. 수량이 많지 않을 수 있어요. ' || v_link;
    if coalesce(v_sms, false) and r.phone <> '' then
      insert into public.mall_builder_notifications (store_id, kind, channel, to_phone, body, restock_request_id)
        values (p.store_id, 'customer_restock', 'sms', r.phone, v_body, r.id) on conflict do nothing;
    end if;
    if coalesce(v_mail, false) and r.email <> '' then
      insert into public.mall_builder_notifications (store_id, kind, channel, to_phone, to_email, subject, body, restock_request_id)
        values (p.store_id, 'email_customer_restock', 'email', '', r.email,
                '[' || coalesce(v_name, '쇼핑몰') || '] 「' || v_label || '」 재입고 안내', v_body, r.id) on conflict do nothing;
    end if;
    update public.mall_builder_restock_requests set status = 'notified', ended_at = now() where id = r.id;
  end loop;
end;
$$;

-- 트리거: 상품이 판매 중이 되거나 재고가 늘면 / 옵션 재고가 늘거나 다시 판매되면
create or replace function public.mall_builder_products_restock()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'on_sale' and (old.status is distinct from 'on_sale' or new.stock > old.stock or new.stock_mode is distinct from old.stock_mode) then
    perform public.mall_builder_restock_fire(new.id, null);
  end if;
  return new;
end;
$$;
create or replace trigger mall_builder_products_restock after update of status, stock, stock_mode on public.mall_builder_products
  for each row execute function public.mall_builder_products_restock();

create or replace function public.mall_builder_variants_restock()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_active and (new.stock > old.stock or not old.is_active) then
    perform public.mall_builder_restock_fire(new.product_id, new.id);
    -- 옵션 고르지 않고 「상품 전체」로 신청한 손님도 하나라도 다시 생기면 알린다
    perform public.mall_builder_restock_fire_whole(new.product_id);
  end if;
  return new;
end;
$$;

-- 옵션 상품에서 옵션 없이 신청한(상품 전체 품절 때) 대기만 확인
create or replace function public.mall_builder_restock_fire_whole(p_product_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.mall_builder_restock_requests q
              where q.product_id = p_product_id and q.status = 'waiting' and q.variant_id is null) then
    perform public.mall_builder_restock_fire(p_product_id, null);
  end if;
end;
$$;
create or replace trigger mall_builder_variants_restock after update of stock, is_active on public.mall_builder_product_variants
  for each row execute function public.mall_builder_variants_restock();

-- 1분 작업이 부르는 정리: 90일 넘은 대기 → 만료, 끝난 지 30일 넘은 신청은 번호·메일 지움
create or replace function public.mall_builder_restock_cleanup(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_store uuid; v_expired integer; v_wiped integer;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_token'; end if;
  select s.store_id into v_store from public.mall_builder_store_scheduler_secrets s where s.run_token_hash = p_token_hash;
  if v_store is null then raise exception 'invalid_token'; end if;
  update public.mall_builder_restock_requests set status = 'expired', ended_at = now()
   where store_id = v_store and status = 'waiting' and created_at < now() - interval '90 days';
  get diagnostics v_expired = row_count;
  update public.mall_builder_restock_requests set phone = '', email = ''
   where store_id = v_store and status <> 'waiting' and ended_at < now() - interval '30 days' and (phone <> '' or email <> '');
  get diagnostics v_wiped = row_count;
  return jsonb_build_object('expired', v_expired, 'wiped', v_wiped);
end;
$$;
