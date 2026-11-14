-- AI 쇼핑몰 빌더 M1-5 — 리셀러 제휴 링크를 주문에 기록 (2026-11-14 마스터 플랜 §4 M1-5)
-- 링크 `?ref=코드`는 손님 브라우저 쿠키 `mb_ref_<몰>`(30일, 마지막 클릭이 덮어씀, D33 RefCatcher 재사용)에 남고,
-- 서버가 DB를 부를 때 쿠키들을 요청 머리글 `x-mb-ref: <몰>=<코드>;<몰2>=<코드2>`로 함께 보낸다.
-- 주문이 들어가기 직전 트리거가 그 머리글을 읽어 주문에 리셀러를 기록한다 → 주문 함수 6개(회원·옵션·견적·비회원·공동구매·정기)의 입력은 바꾸지 않는다.
-- 우선순위: 링크(30일 마지막 클릭) > 가입 때 연결된 리셀러(D33). 본인 링크·쉬는 리셀러·분양몰 주문·본사 사본 주문은 기록하지 않는다.
-- 수수료(D33 0052 트리거)는 주문에 기록된 리셀러를 먼저 보고, 옛 주문만 가입 연결을 본다(비회원 링크 주문도 적립).
-- 추가·함수 교체만(표·데이터 drop 없음).

-- 1. 주문 칸
alter table public.mall_builder_orders add column if not exists reseller_id uuid references public.mall_builder_resellers (id) on delete set null;
alter table public.mall_builder_orders add column if not exists ref_source text;
alter table public.mall_builder_orders add column if not exists ref_code text;
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_orders_ref_source_chk') then
    alter table public.mall_builder_orders add constraint mall_builder_orders_ref_source_chk check (ref_source is null or ref_source in ('link', 'customer'));
  end if;
end $c$;
create index if not exists mall_builder_orders_reseller on public.mall_builder_orders (reseller_id, created_at desc) where reseller_id is not null;

-- 2. 요청 머리글에서 이 몰의 리셀러 코드 읽기(없거나 형식이 틀리면 null — 머리글이 깨져도 주문은 막지 않음)
create or replace function mall_builder_private.ref_code_from_headers(p_slug text)
returns text language plpgsql stable set search_path = '' as $$
declare
  v_raw text;
  v_m text[];
begin
  begin
    v_raw := (nullif(current_setting('request.headers', true), '')::json) ->> 'x-mb-ref';
  exception when others then
    return null;
  end;
  if v_raw is null or p_slug is null or char_length(v_raw) > 2000 then return null; end if;
  v_m := regexp_match(v_raw, '(?:^|;)\s*' || regexp_replace(p_slug, '([^a-z0-9])', '\\\1', 'g') || '=([A-Za-z0-9]{3,20})\s*(?:;|$)');
  return upper(v_m[1]);
end;
$$;
revoke all on function mall_builder_private.ref_code_from_headers(text) from public, anon, authenticated;

-- 3. 주문 넣기 직전: 리셀러 기록(손님이 넣은 값은 무시하고 항상 다시 정함)
create or replace function public.mall_builder_orders_ref()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  st public.mall_builder_stores%rowtype;
  v_code text;
  r public.mall_builder_resellers%rowtype;
  v_owner uuid;
begin
  new.reseller_id := null;
  new.ref_source := null;
  new.ref_code := null;
  if new.resale_order_id is not null then return new; end if; -- 분양몰 주문의 본사 사본
  select * into st from public.mall_builder_stores s where s.id = new.store_id;
  if st.id is null or st.kind = 'resale' then return new; end if; -- 분양몰은 분양 수수료로 따로 계산
  v_code := mall_builder_private.ref_code_from_headers(st.slug);
  if v_code is not null then
    select * into r from public.mall_builder_resellers x where x.store_id = new.store_id and x.code = v_code and x.active;
    if r.id is not null then
      select c.user_id into v_owner from public.mall_builder_store_customers c where c.id = r.customer_id;
      if v_owner is distinct from coalesce(new.user_id, auth.uid()) and r.customer_id is distinct from new.customer_id then
        new.reseller_id := r.id;
        new.ref_source := 'link';
        new.ref_code := r.code;
        return new;
      end if;
    end if;
  end if;
  if new.customer_id is not null then
    select x.* into r from public.mall_builder_store_customers c join public.mall_builder_resellers x on x.id = c.reseller_id
     where c.id = new.customer_id and x.active and x.customer_id <> new.customer_id;
    if r.id is not null then
      new.reseller_id := r.id;
      new.ref_source := 'customer';
      new.ref_code := r.code;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_ref on public.mall_builder_orders;
create trigger mall_builder_orders_ref before insert on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_ref();

-- 손님·직원이 나중에 주문의 리셀러를 바꾸지 못하게(시스템 함수만 바꿈)
create or replace function public.mall_builder_orders_ref_lock()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.reseller_id := old.reseller_id;
    new.ref_source := old.ref_source;
    new.ref_code := old.ref_code;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_ref_lock on public.mall_builder_orders;
create trigger mall_builder_orders_ref_lock before update of reseller_id, ref_source, ref_code on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_ref_lock();

-- 4. 수수료 적립: 주문에 기록된 리셀러 우선, 옛 주문(기록 없음)은 가입 연결
create or replace function public.mall_builder_orders_reseller()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r public.mall_builder_resellers%rowtype;
  v_amt bigint;
  v_earn public.mall_builder_reseller_ledger%rowtype;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'confirmed' then
    if new.reseller_id is not null then
      select * into r from public.mall_builder_resellers x where x.id = new.reseller_id and x.active;
    elsif new.customer_id is not null and not coalesce(new.is_guest, false) then
      select rs.* into r from public.mall_builder_store_customers c join public.mall_builder_resellers rs on rs.id = c.reseller_id
       where c.id = new.customer_id and rs.active;
    end if;
    if r.id is null or r.customer_id is not distinct from new.customer_id then return new; end if;
    v_amt := mall_builder_private.commission_of(new.total, new.shipping_fee, r.rate);
    if v_amt > 0 and not exists (select 1 from public.mall_builder_reseller_ledger l where l.order_id = new.id and l.kind = 'earn') then
      perform mall_builder_private.reseller_add(new.store_id, r.id, new.id, null, 'earn', v_amt, '주문 ' || new.order_no || ' 구매 확정');
    end if;
  elsif new.status in ('cancelled', 'returned') then
    select * into v_earn from public.mall_builder_reseller_ledger l where l.order_id = new.id and l.kind = 'earn';
    if v_earn.id is not null and not exists (select 1 from public.mall_builder_reseller_ledger l where l.order_id = new.id and l.kind = 'reclaim') then
      perform mall_builder_private.reseller_add(new.store_id, v_earn.reseller_id, new.id, null, 'reclaim', -v_earn.amount, '주문 ' || new.order_no || ' ' || public.mall_builder_status_label(new.status) || ' — 회수');
    end if;
  end if;
  return new;
end $$;
