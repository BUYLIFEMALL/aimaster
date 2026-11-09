-- AI 쇼핑몰 빌더 D20 — 폐쇄몰(승인·초대 코드 회원만 입장) (플랜 docs/PLAN_20261109_CLOSED_MALL.md)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만(지우기·권한 회수·규칙 변경 없음 — 함수는 create or replace).
-- 결정(주인님 2026-11-09): 승인제·초대 코드를 각각 켜고 끔 · 몰 공용 코드 1개 · 승인 전엔 안내·로그인·가입만 · 기존 가입자는 그대로 허용.
-- 몰 설정: stores.settings.closed = {enabled, approval, code, notice}. 켜면 비회원 주문(settings.guest_order)은 끔.
-- DB에서 막는 것: 상품·옵션 읽기(mall_builder_product_visible), 주문 넣기(주문 표 넣기 전 트리거 — 회원·비회원·견적 모든 경로).
-- 화면에서 막는 것: 손님 레이아웃이 승인 전이면 가입·마이페이지 말고는 안내 화면만(서버에서 바꿔 그림 — 내용이 내려가지 않음).

-- ── 0040a 칸·표 ──
alter table public.mall_builder_store_customers add column if not exists member_status text not null default 'approved'
  check (member_status in ('approved', 'pending', 'rejected'));
alter table public.mall_builder_store_customers add column if not exists member_reject_reason text check (member_reject_reason is null or char_length(member_reject_reason) <= 200);
-- 가입할 때만 손님이 넣는 초대 코드 자리(트리거가 확인하고 늘 비워 저장한다)
alter table public.mall_builder_store_customers add column if not exists invite_code text;

-- 몰 공용 초대 코드 — 규칙 0개 표(운영자 함수로만 읽고 씀)
create table if not exists public.mall_builder_store_invites (
  store_id uuid primary key references public.mall_builder_stores (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{6,20}$'),
  uses integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.mall_builder_store_invites enable row level security;

-- ── 0040b 판단 함수 ──
create or replace function public.mall_builder_store_closed(p_store_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((s.settings -> 'closed' ->> 'enabled')::boolean, false) from public.mall_builder_stores s where s.id = p_store_id
$$;

-- 이 몰을 볼 수 있는가: 폐쇄몰이 아니거나, 운영자거나, 입장 승인된 손님
create or replace function public.mall_builder_closed_ok(p_store_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not public.mall_builder_store_closed(p_store_id)
      or public.mall_builder_is_store_staff(p_store_id)
      or exists (select 1 from public.mall_builder_store_customers c
                  where c.store_id = p_store_id and c.user_id = auth.uid() and c.member_status = 'approved')
$$;

-- 상품 보이기(0011 등) + 폐쇄몰 조건
create or replace function public.mall_builder_product_visible(p_product_id uuid)
returns boolean language sql stable security definer set search_path to '' as $function$
  select exists (
    select 1 from public.mall_builder_products p join public.mall_builder_stores s on s.id = p.store_id
    where p.id = p_product_id and p.status in ('on_sale', 'sold_out') and s.status = 'active'
      and (p.visibility <> 'business_only' or public.mall_builder_shop_viewer(p.store_id) = 'business')
      and public.mall_builder_closed_ok(p.store_id)
  );
$function$;

-- 초대 코드 확인(맞으면 사용 수 +1). 운영자 권한으로 규칙 0개 표를 읽는다
create or replace function mall_builder_private.invite_use(p_store_id uuid, p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.mall_builder_store_invites i set uses = uses + 1, updated_at = now()
   where i.store_id = p_store_id and i.code = upper(btrim(coalesce(p_code, '')));
  return found;
end;
$$;

-- ── 0040c 가입·고치기 트리거 ──
-- 가입(손님 본인 insert): 폐쇄몰이면 코드가 맞으면 승인, 승인제면 대기, 둘 다 아니면 거절. 손님이 보낸 상태 값은 믿지 않는다
create or replace function public.mall_builder_store_customers_closed()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_closed jsonb;
  v_code text := upper(btrim(coalesce(new.invite_code, '')));
begin
  new.invite_code := null;
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'UPDATE' then
    new.member_status := old.member_status;
    new.member_reject_reason := old.member_reject_reason;
    return new;
  end if;
  new.member_reject_reason := null;
  select s.settings -> 'closed' into v_closed from public.mall_builder_stores s where s.id = new.store_id;
  if not coalesce((v_closed ->> 'enabled')::boolean, false) then
    new.member_status := 'approved';
    return new;
  end if;
  if v_code <> '' then
    if coalesce((v_closed ->> 'code')::boolean, false) and mall_builder_private.invite_use(new.store_id, v_code) then
      new.member_status := 'approved';
      return new;
    end if;
    raise exception '초대 코드가 맞지 않습니다. 운영자에게 받은 코드를 다시 확인해 주세요.';
  end if;
  if coalesce((v_closed ->> 'approval')::boolean, false) then
    new.member_status := 'pending';
    return new;
  end if;
  raise exception '회원 전용 몰입니다. 운영자에게 받은 초대 코드를 넣어 주세요.';
end;
$$;
create trigger mall_builder_store_customers_closed before insert or update on public.mall_builder_store_customers
  for each row execute function public.mall_builder_store_customers_closed();

-- 주문 넣기 전: 폐쇄몰에서 승인 안 된 손님·비회원 주문은 막음(모든 주문 함수 공통)
create or replace function public.mall_builder_orders_closed_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.mall_builder_store_closed(new.store_id) and not public.mall_builder_closed_ok(new.store_id) then
    raise exception '회원 전용 몰입니다. 입장 승인을 받은 뒤 주문할 수 있습니다.';
  end if;
  return new;
end;
$$;
create trigger mall_builder_orders_closed_guard before insert on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_closed_guard();

-- ── 0040d 운영자·손님 함수 ──
-- 운영자: 폐쇄몰 저장. 켜면 비회원 주문 끔. 코드를 켜는데 코드가 없거나 새로 만들기면 자동 생성(8자)
create or replace function public.mall_builder_closed_save(p_store_id uuid, p_enabled boolean, p_approval boolean, p_code boolean, p_notice text, p_new_code boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_notice text := left(btrim(coalesce(p_notice, '')), 300);
  v_code text;
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  if coalesce(p_enabled, false) and not (coalesce(p_approval, false) or coalesce(p_code, false)) then
    raise exception '폐쇄몰을 켜려면 「운영자 승인」과 「초대 코드」 중 하나 이상을 골라 주세요.';
  end if;
  update public.mall_builder_stores s set
    settings = coalesce(s.settings, '{}'::jsonb)
      || jsonb_build_object('closed', jsonb_build_object('enabled', coalesce(p_enabled, false), 'approval', coalesce(p_approval, false), 'code', coalesce(p_code, false), 'notice', v_notice))
      || case when coalesce(p_enabled, false) then jsonb_build_object('guest_order', false) else '{}'::jsonb end,
    updated_at = now()
   where s.id = p_store_id;
  if coalesce(p_code, false) and (p_new_code or not exists (select 1 from public.mall_builder_store_invites i where i.store_id = p_store_id)) then
    v_code := upper(substr(translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=0O1Il', ''), 1, 8));
    insert into public.mall_builder_store_invites (store_id, code) values (p_store_id, v_code)
      on conflict (store_id) do update set code = excluded.code, uses = 0, updated_at = now();
  end if;
  return public.mall_builder_closed_status(p_store_id);
end;
$$;

-- 운영자: 폐쇄몰 상태(코드·사용 수·입장 대기 수)
create or replace function public.mall_builder_closed_status(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb; i public.mall_builder_store_invites%rowtype;
begin
  if auth.uid() is null or not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 고칠 권한이 없습니다.'; end if;
  select s.settings -> 'closed' into v from public.mall_builder_stores s where s.id = p_store_id;
  select * into i from public.mall_builder_store_invites x where x.store_id = p_store_id;
  return coalesce(v, '{}'::jsonb) || jsonb_build_object('invite_code', coalesce(i.code, ''), 'invite_uses', coalesce(i.uses, 0),
    'pending', (select count(*) from public.mall_builder_store_customers c where c.store_id = p_store_id and c.member_status = 'pending'));
end;
$$;

-- 운영자: 입장 승인·반려. 승인되면 손님에게 문자(몰이 문자 알림을 쓸 수 있을 때)
create or replace function public.mall_builder_member_review(p_customer_id uuid, p_approve boolean, p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.mall_builder_store_customers%rowtype;
  v_sms boolean;
  v_name text;
  v_slug text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into c from public.mall_builder_store_customers x where x.id = p_customer_id for update;
  if c.id is null or not public.mall_builder_is_store_staff(c.store_id) then raise exception '이 손님을 바꿀 권한이 없습니다.'; end if;
  if not p_approve and char_length(btrim(coalesce(p_reason, ''))) not between 1 and 200 then raise exception '반려 사유를 1~200자로 입력해 주세요.'; end if;
  update public.mall_builder_store_customers set member_status = case when p_approve then 'approved' else 'rejected' end,
    member_reject_reason = case when p_approve then null else btrim(p_reason) end
   where id = c.id;
  if p_approve and c.member_status <> 'approved' and coalesce(c.phone, '') <> '' then
    select x.solapi_api_key <> '' and x.solapi_api_secret <> '' and ns.sender_phone <> ''
      and exists (select 1 from public.mall_builder_store_schedulers sc where sc.store_id = x.store_id and sc.job_id is not null and not sc.paused)
      into v_sms
      from public.mall_builder_store_scheduler_secrets x join public.mall_builder_store_notify_settings ns on ns.store_id = x.store_id
     where x.store_id = c.store_id;
    if coalesce(v_sms, false) then
      select st.name, st.slug into v_name, v_slug from public.mall_builder_stores st where st.id = c.store_id;
      insert into public.mall_builder_notifications (store_id, kind, channel, to_phone, body)
      values (c.store_id, 'customer_member_approved', 'sms', c.phone,
        '[' || coalesce(v_name, '쇼핑몰') || '] 회원 입장이 승인되었습니다. 이제 상품을 보고 주문할 수 있어요. {{site}}/s/' || v_slug);
    end if;
  end if;
end;
$$;

-- 손님: 입장 대기·반려 상태에서 초대 코드로 바로 입장
create or replace function public.mall_builder_member_use_code(p_store_id uuid, p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.mall_builder_store_customers%rowtype; v_closed jsonb;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into c from public.mall_builder_store_customers x where x.store_id = p_store_id and x.user_id = auth.uid() for update;
  if c.id is null then raise exception '이 몰에 먼저 가입해 주세요.'; end if;
  if c.member_status = 'approved' then return; end if;
  select s.settings -> 'closed' into v_closed from public.mall_builder_stores s where s.id = p_store_id;
  if not coalesce((v_closed ->> 'code')::boolean, false) or not mall_builder_private.invite_use(p_store_id, p_code) then
    raise exception '초대 코드가 맞지 않습니다. 운영자에게 받은 코드를 다시 확인해 주세요.';
  end if;
  update public.mall_builder_store_customers set member_status = 'approved', member_reject_reason = null where id = c.id;
end;
$$;

-- ── 0040e ── 가입 트리거(손님 권한)가 초대 코드 확인 함수를 부를 수 있게. 이 스키마는 바깥 API(PostgREST)에 노출되지 않는다
grant usage on schema mall_builder_private to authenticated;
