-- AI 쇼핑몰 빌더 M4-C3 — 리셀러 판매 내역·상품 판매 수·픽·짧은 링크 (2026-11-15 마스터 플랜 §4 M4-C2·C3)
-- 1) 판매 내역: 리셀러는 주문 표를 읽을 수 없으므로(손님 이름·주소·연락처 보호) 주문번호·날짜·상태·품목 요약·금액·리워드만 돌려주는 함수
-- 2) 상품 판매 수: 최근 N일 결제 이후 주문의 남은 수량 합(몰 전체) — 리셀러 「베스트」 정렬·카드 표시용, 그 몰 리셀러·운영자만
-- 3) 픽: 리셀러가 고른 상품 목록(C4 진열 페이지에서도 씀)
-- 4) 짧은 링크: `/s/<몰>/l/<키>` → 상품(또는 몰 첫 화면) + ?ref=<코드>. 누가 열어도 되고(손님), 열 때 누른 수 +1
-- 추가만(표·자료 지우기 없음, 보기 규칙은 drop if exists 뒤 다시 만듦). 손님 개인정보 칸(receiver·guest_*·depositor·memo)은 어느 함수도 돌려주지 않는다.

-- 0. 이 몰의 「활동 중 리셀러 본인」 id(없으면 null) — 아래 함수들 안에서만 씀
create or replace function mall_builder_private.my_active_reseller(p_store uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select rs.id from public.mall_builder_resellers rs
    join public.mall_builder_store_customers c on c.id = rs.customer_id
   where rs.store_id = p_store and c.user_id = auth.uid() and rs.active
   limit 1
$$;
revoke all on function mall_builder_private.my_active_reseller(uuid) from public, anon;

-- 1. 판매 내역
create or replace function public.mall_builder_reseller_sales(p_store_id uuid, p_limit int default 100)
returns table (order_id uuid, order_no text, created_at timestamptz, status text, ref_source text,
               item_count int, first_item text, items_total bigint,
               reward bigint, reward_pending bigint, reward_paid bigint, reward_held bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_r uuid := mall_builder_private.my_active_reseller(p_store_id);
begin
  if v_r is null then raise exception '활동 중인 리셀러만 볼 수 있습니다.'; end if;
  return query
    select o.id, o.order_no, o.created_at, o.status, o.ref_source,
           coalesce(it.n, 0)::int, coalesce(it.first_name, ''), coalesce(it.total, 0)::bigint,
           coalesce(w.amt, 0)::bigint, coalesce(w.pend, 0)::bigint, coalesce(w.paid, 0)::bigint, coalesce(w.held, 0)::bigint
      from public.mall_builder_orders o
      left join lateral (
        select count(*) as n,
               (array_agg(i.name_snapshot order by i.line_total desc))[1] as first_name,
               sum(greatest(i.qty - coalesce(i.cancelled_qty, 0), 0)::bigint * i.unit_price) as total
          from public.mall_builder_order_items i where i.order_id = o.id) it on true
      left join lateral (
        select sum(x.amount) filter (where x.status <> 'deleted') as amt,
               sum(x.amount) filter (where x.status = 'pending') as pend,
               sum(x.amount) filter (where x.status = 'paid') as paid,
               sum(x.amount) filter (where x.status = 'held') as held
          from public.mall_builder_reseller_rewards x where x.order_id = o.id and x.reseller_id = v_r) w on true
     where o.store_id = p_store_id and o.reseller_id = v_r
     order by o.created_at desc
     limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;
revoke all on function public.mall_builder_reseller_sales(uuid, int) from public, anon;
grant execute on function public.mall_builder_reseller_sales(uuid, int) to authenticated;

-- 2. 상품 판매 수(몰 전체, 최근 p_days일, 결제 이후 상태만, 취소 수량 뺌)
create or replace function public.mall_builder_product_sold(p_store_id uuid, p_days int default 30)
returns table (product_id uuid, sold bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if mall_builder_private.my_active_reseller(p_store_id) is null and not public.mall_builder_is_store_staff(p_store_id) then
    raise exception '이 몰의 리셀러·운영자만 볼 수 있습니다.';
  end if;
  return query
    select i.product_id, sum(greatest(i.qty - coalesce(i.cancelled_qty, 0), 0))::bigint
      from public.mall_builder_order_items i
      join public.mall_builder_orders o on o.id = i.order_id
     where o.store_id = p_store_id
       and o.status in ('paid', 'preparing', 'shipping', 'delivered', 'confirmed')
       and o.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
       and i.product_id is not null
     group by i.product_id;
end;
$$;
revoke all on function public.mall_builder_product_sold(uuid, int) from public, anon;
grant execute on function public.mall_builder_product_sold(uuid, int) to authenticated;

-- 3. 픽
create table if not exists public.mall_builder_reseller_picks (
  reseller_id uuid not null references public.mall_builder_resellers (id) on delete cascade,
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reseller_id, product_id)
);
create index if not exists mall_builder_reseller_picks_store on public.mall_builder_reseller_picks (store_id, product_id);
alter table public.mall_builder_reseller_picks enable row level security;
drop policy if exists mall_builder_reseller_picks_read on public.mall_builder_reseller_picks;
create policy mall_builder_reseller_picks_read on public.mall_builder_reseller_picks for select
  using (mall_builder_private.is_my_reseller(reseller_id) or public.mall_builder_staff_can(store_id, 'customers'));

-- 픽 켜고 끄기 → 바뀐 뒤 상태(true = 픽함). 판매 중인 이 몰 상품만, 리셀러당 300개까지
create or replace function public.mall_builder_reseller_pick_toggle(p_store_id uuid, p_product_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_r uuid := mall_builder_private.my_active_reseller(p_store_id);
begin
  if v_r is null then raise exception '활동 중인 리셀러만 쓸 수 있습니다.'; end if;
  delete from public.mall_builder_reseller_picks where reseller_id = v_r and product_id = p_product_id;
  if found then return false; end if;
  if not exists (select 1 from public.mall_builder_products p where p.id = p_product_id and p.store_id = p_store_id and p.status = 'on_sale') then
    raise exception '판매 중인 상품만 픽할 수 있습니다.';
  end if;
  if (select count(*) from public.mall_builder_reseller_picks where reseller_id = v_r) >= 300 then
    raise exception '픽은 300개까지입니다.';
  end if;
  insert into public.mall_builder_reseller_picks (reseller_id, product_id, store_id) values (v_r, p_product_id, p_store_id);
  return true;
end;
$$;
revoke all on function public.mall_builder_reseller_pick_toggle(uuid, uuid) from public, anon;
grant execute on function public.mall_builder_reseller_pick_toggle(uuid, uuid) to authenticated;

-- 4. 짧은 링크
create table if not exists public.mall_builder_reseller_links (
  key text primary key check (key ~ '^[A-Za-z0-9]{7}$'),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  reseller_id uuid not null references public.mall_builder_resellers (id) on delete cascade,
  product_id uuid references public.mall_builder_products (id) on delete cascade, -- null = 몰 첫 화면
  clicks bigint not null default 0,
  last_click_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists mall_builder_reseller_links_product on public.mall_builder_reseller_links (reseller_id, product_id) where product_id is not null;
create unique index if not exists mall_builder_reseller_links_home on public.mall_builder_reseller_links (reseller_id) where product_id is null;
alter table public.mall_builder_reseller_links enable row level security;
drop policy if exists mall_builder_reseller_links_read on public.mall_builder_reseller_links;
create policy mall_builder_reseller_links_read on public.mall_builder_reseller_links for select
  using (mall_builder_private.is_my_reseller(reseller_id) or public.mall_builder_staff_can(store_id, 'customers'));

-- 만들기(이미 있으면 그 키) — 리셀러 본인만. p_product_id null = 몰 첫 화면
create or replace function public.mall_builder_reseller_link_make(p_store_id uuid, p_product_id uuid default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_r uuid := mall_builder_private.my_active_reseller(p_store_id);
  v_key text;
  v_try int := 0;
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
begin
  if v_r is null then raise exception '활동 중인 리셀러만 쓸 수 있습니다.'; end if;
  if p_product_id is not null and not exists (select 1 from public.mall_builder_products p where p.id = p_product_id and p.store_id = p_store_id) then
    raise exception '이 몰 상품이 아닙니다.';
  end if;
  select l.key into v_key from public.mall_builder_reseller_links l
   where l.reseller_id = v_r and l.product_id is not distinct from p_product_id;
  if v_key is not null then return v_key; end if;
  loop
    v_try := v_try + 1;
    select string_agg(substr(chars, 1 + floor(random() * length(chars))::int, 1), '') into v_key from generate_series(1, 7);
    begin
      insert into public.mall_builder_reseller_links (key, store_id, reseller_id, product_id) values (v_key, p_store_id, v_r, p_product_id);
      return v_key;
    exception when unique_violation then
      -- 같은 리셀러·상품이 동시에 만들어졌으면 그 키, 아니면 키 겹침 → 다시
      select l.key into v_key from public.mall_builder_reseller_links l
       where l.reseller_id = v_r and l.product_id is not distinct from p_product_id;
      if v_key is not null then return v_key; end if;
      if v_try >= 10 then raise; end if;
    end;
  end loop;
end;
$$;
revoke all on function public.mall_builder_reseller_link_make(uuid, uuid) from public, anon;
grant execute on function public.mall_builder_reseller_link_make(uuid, uuid) to authenticated;

-- 열기(손님 누구나) — 그 몰 주소 이름이 맞고 리셀러가 활동 중일 때만 코드를 돌려줌.
-- 상품이 판매 중·품절(재입고 알림 신청 가능)이 아니면 product_id = null(몰 첫 화면으로). 누른 수 +1
create or replace function public.mall_builder_reseller_link_open(p_slug text, p_key text)
returns table (product_id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare l public.mall_builder_reseller_links%rowtype; v_code text; v_pid uuid;
begin
  if p_key is null or p_key !~ '^[A-Za-z0-9]{7}$' then return; end if;
  select x.* into l from public.mall_builder_reseller_links x
    join public.mall_builder_stores s on s.id = x.store_id
   where x.key = p_key and s.slug = p_slug;
  if l.key is null then return; end if;
  select rs.code into v_code from public.mall_builder_resellers rs where rs.id = l.reseller_id and rs.active;
  if v_code is null then return; end if;
  if l.product_id is not null then
    select p.id into v_pid from public.mall_builder_products p where p.id = l.product_id and p.status in ('on_sale', 'sold_out');
  end if;
  update public.mall_builder_reseller_links set clicks = clicks + 1, last_click_at = now() where key = l.key;
  return query select v_pid, v_code;
end;
$$;
revoke all on function public.mall_builder_reseller_link_open(text, text) from public;
grant execute on function public.mall_builder_reseller_link_open(text, text) to anon, authenticated;
