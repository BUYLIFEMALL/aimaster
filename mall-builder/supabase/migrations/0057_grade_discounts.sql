-- AI 쇼핑몰 빌더 T1 — ① B2B 입점몰 보강: 등급 관리·등급 할인 3단계·공급가 하한·공급사별 바로 판매
-- 주인님 결정(2026-11-11): 등급 할인 = 등급 기본율 → 카테고리별 등급율 → 상품 예외(구체적인 것이 우선), 할인은 몰이 정하고
--   공급가(+최소 마진 %) 밑으로는 팔지 않음, 공급사별 「바로 판매 / 승인 후 판매」, 폐쇄몰은 가입 후 운영자 승인.
-- 플랜 labs/mall-builder/docs/PLAN_20261111_THREE_MALLS.md §9·§10. AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만. 추가·함수 교체만(drop 없음).
-- 우선순위: 공동구매가 > 거래처 특가 > 상품 예외 > 카테고리 등급율 > 등급 기본율 → 수량 할인 → 공급가 하한

-- ── A 등급 관리 ──
alter table public.mall_builder_customer_grades add column if not exists default_discount_rate int not null default 0 check (default_discount_rate between 0 and 90);

create or replace function public.mall_builder_grade_save(p_store_id uuid, p_id uuid, p_name text, p_is_business boolean, p_rank int, p_default_rate int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare g public.mall_builder_customer_grades%rowtype; v_name text := btrim(coalesce(p_name, '')); v_id uuid;
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'customers') then raise exception '등급 관리는 손님 권한이 있는 운영자만 할 수 있습니다.'; end if;
  if char_length(v_name) not between 1 and 20 then raise exception '등급 이름을 1~20자로 적어 주세요.'; end if;
  if p_rank is null or p_rank not between 0 and 1000 then raise exception '순서는 0~1000 사이 숫자로 적어 주세요.'; end if;
  if p_default_rate is null or p_default_rate not between 0 and 90 then raise exception '기본 할인율은 0~90%% 사이로 적어 주세요.'; end if;
  if p_id is null then
    if (select count(*) from public.mall_builder_customer_grades x where x.store_id = p_store_id) >= 20 then raise exception '등급은 20개까지 만들 수 있습니다.'; end if;
    insert into public.mall_builder_customer_grades (store_id, code, name, rank, is_business, default_discount_rate)
    values (p_store_id, case when p_is_business then 'biz_' else 'cons_' end || substr(md5(gen_random_uuid()::text), 1, 8), v_name, p_rank, coalesce(p_is_business, false), p_default_rate)
    returning id into v_id;
    return v_id;
  end if;
  select * into g from public.mall_builder_customer_grades x where x.id = p_id and x.store_id = p_store_id for update;
  if g.id is null then raise exception '등급을 찾을 수 없습니다.'; end if;
  if coalesce(p_is_business, g.is_business) <> g.is_business then
    if g.code in ('consumer', 'business') then raise exception '기본 등급(일반·사업자)은 소비자/사업자 구분을 바꿀 수 없습니다.'; end if;
    if exists (select 1 from public.mall_builder_store_customers c where c.grade_id = g.id) then raise exception '이 등급을 쓰는 손님이 있어 소비자/사업자 구분을 바꿀 수 없습니다.'; end if;
  end if;
  update public.mall_builder_customer_grades set name = v_name, rank = p_rank, is_business = coalesce(p_is_business, g.is_business), default_discount_rate = p_default_rate where id = g.id;
  return g.id;
end;
$$;

-- 등급 지우기: 기본 등급이 아니고 쓰는 손님이 없을 때만(등급가·카테고리 할인율도 함께 지움)
create or replace function public.mall_builder_grade_delete(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare g public.mall_builder_customer_grades%rowtype;
begin
  select * into g from public.mall_builder_customer_grades x where x.id = p_id for update;
  if g.id is null or auth.uid() is null or not public.mall_builder_staff_can(g.store_id, 'customers') then raise exception '등급을 찾을 수 없습니다.'; end if;
  if g.code in ('consumer', 'business') then raise exception '기본 등급(일반·사업자)은 지울 수 없습니다.'; end if;
  if exists (select 1 from public.mall_builder_store_customers c where c.grade_id = g.id) then raise exception '이 등급을 쓰는 손님이 있습니다. 손님 등급을 먼저 바꿔 주세요.'; end if;
  delete from public.mall_builder_product_grade_prices where grade_id = g.id;
  delete from public.mall_builder_customer_grades where id = g.id;
end;
$$;

-- 손님 등급 바꾸기: 사업자 등급은 승인된 사업자에게만, 승인된 사업자에게는 사업자 등급만
create or replace function public.mall_builder_customer_set_grade(p_customer_id uuid, p_grade_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.mall_builder_store_customers%rowtype; g public.mall_builder_customer_grades%rowtype;
begin
  select * into c from public.mall_builder_store_customers x where x.id = p_customer_id for update;
  if c.id is null or auth.uid() is null or not public.mall_builder_staff_can(c.store_id, 'customers') then raise exception '손님을 찾을 수 없습니다.'; end if;
  select * into g from public.mall_builder_customer_grades x where x.id = p_grade_id and x.store_id = c.store_id;
  if g.id is null then raise exception '등급을 찾을 수 없습니다.'; end if;
  if g.is_business and not (c.kind = 'business' and c.approval_status = 'approved') then raise exception '사업자 등급은 사업자 승인을 받은 손님에게만 줄 수 있습니다.'; end if;
  if not g.is_business and c.kind = 'business' and c.approval_status = 'approved' then raise exception '승인된 사업자에게는 사업자 등급을 주세요.'; end if;
  update public.mall_builder_store_customers set grade_id = g.id where id = c.id;
  perform mall_builder_private.staff_log(c.store_id, 'customer_grade', 'customer', c.id::text, g.name);
end;
$$;

-- ── B 카테고리별 등급 할인율 ──
create table if not exists public.mall_builder_category_grade_rates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  category_id uuid not null references public.mall_builder_categories (id) on delete cascade,
  grade_id uuid not null references public.mall_builder_customer_grades (id) on delete cascade,
  discount_rate int not null check (discount_rate between 0 and 90),
  unique (category_id, grade_id)
);
create index if not exists mall_builder_category_grade_rates_store on public.mall_builder_category_grade_rates (store_id);
alter table public.mall_builder_category_grade_rates enable row level security;
create policy mall_builder_category_grade_rates_staff on public.mall_builder_category_grade_rates for all
  using (public.mall_builder_staff_can(store_id, 'products')) with check (public.mall_builder_staff_can(store_id, 'products'));

-- ── D 공급가 하한(몰 최소 마진) ──
create table if not exists public.mall_builder_price_rules (
  store_id uuid primary key references public.mall_builder_stores (id) on delete cascade,
  min_margin_rate numeric(5, 2) not null default 0 check (min_margin_rate between 0 and 100),
  updated_at timestamptz not null default now()
);
alter table public.mall_builder_price_rules enable row level security;
create policy mall_builder_price_rules_staff on public.mall_builder_price_rules for all
  using (public.mall_builder_staff_can(store_id, 'products')) with check (public.mall_builder_staff_can(store_id, 'products'));

-- 등급 할인 결정: 상품 예외 → 카테고리(자기→부모→조부모 중 가장 가까운 것, 여러 카테고리면 큰 할인) → 등급 기본율
create or replace function mall_builder_private.grade_resolve(p_product uuid, p_grade uuid)
returns table (price bigint, rate int) language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_p bigint; v_r int; v_cat int; v_def int;
begin
  if p_grade is null then return; end if;
  select gp.price, gp.discount_rate into v_p, v_r from public.mall_builder_product_grade_prices gp where gp.product_id = p_product and gp.grade_id = p_grade;
  if v_p is not null or v_r is not null then price := v_p; rate := v_r; return next; return; end if;
  with recursive up as (
    select pc.category_id as start_id, c.id as cid, c.parent_id as pid, 0 as lvl
      from public.mall_builder_product_categories pc join public.mall_builder_categories c on c.id = pc.category_id
     where pc.product_id = p_product
    union all
    select up.start_id, c.id, c.parent_id, up.lvl + 1 from up join public.mall_builder_categories c on c.id = up.pid where up.lvl < 3
  ), hit as (
    select distinct on (up.start_id) up.start_id, r.discount_rate as dr
      from up join public.mall_builder_category_grade_rates r on r.category_id = up.cid and r.grade_id = p_grade
     order by up.start_id, up.lvl
  )
  select max(hit.dr) into v_cat from hit;
  if v_cat is not null then price := null; rate := v_cat; return next; return; end if;
  select g.default_discount_rate into v_def from public.mall_builder_customer_grades g where g.id = p_grade;
  if coalesce(v_def, 0) > 0 then price := null; rate := v_def; return next; end if;
  return;
end;
$$;

-- 공급가 하한: 공급사 상품이면 ceil(공급가 × (100 + 최소 마진) / 100), 판매가(+옵션)를 넘지는 않음. 자체 상품은 null
create or replace function mall_builder_private.price_floor(p_product uuid, p_base bigint)
returns bigint language sql stable security definer set search_path = '' as $$
  select least(ceil(s.supply_price * (100 + coalesce(r.min_margin_rate, 0)) / 100.0)::bigint, p_base)
    from public.mall_builder_product_supply s
    join public.mall_builder_products p on p.id = s.product_id
    left join public.mall_builder_price_rules r on r.store_id = p.store_id
   where s.product_id = p_product
$$;

-- 화면용: 내(또는 운영자가 고른 손님의) 등급 할인과 하한. 하한은 걸릴 가능성이 있을 때만 돌려준다(공급가 역산 방지)
create or replace function public.mall_builder_price_rules_for(p_store_id uuid, p_product_ids uuid[], p_customer_id uuid default null)
returns table (product_id uuid, price bigint, rate int, floor_price bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_staff boolean := public.mall_builder_is_store_staff(p_store_id); v_cid uuid; v_grade uuid;
begin
  if p_customer_id is not null and v_staff then
    select c.id, c.grade_id into v_cid, v_grade from public.mall_builder_store_customers c where c.id = p_customer_id and c.store_id = p_store_id;
  elsif auth.uid() is not null then
    select c.id, c.grade_id into v_cid, v_grade from public.mall_builder_store_customers c where c.store_id = p_store_id and c.user_id = auth.uid();
  end if;
  return query
  with b as (
    select p.id as pid, p.base_price as bp, gr.price as gpr, gr.rate as grt, mall_builder_private.price_floor(p.id, p.base_price) as fl
      from public.mall_builder_products p
      left join lateral mall_builder_private.grade_resolve(p.id, v_grade) gr on true
     where p.store_id = p_store_id and p.id = any(p_product_ids) and (v_staff or public.mall_builder_product_visible(p.id))
  ), l as (
    select b.*,
      least(
        coalesce(b.gpr, case when b.grt is not null then floor(b.bp * (100 - b.grt) / 100.0)::bigint end, b.bp),
        coalesce((select min(coalesce(cp.price, floor(b.bp * (100 - cp.discount_rate) / 100.0)::bigint))
                    from public.mall_builder_customer_prices cp where v_cid is not null and cp.customer_id = v_cid and (cp.product_id = b.pid or cp.product_id is null)), b.bp)
      ) as lo
    from b
  )
  select l.pid, l.gpr, l.grt,
    case when l.fl is not null and l.fl > least(l.lo, coalesce((
           select min(case t.discount_type when 'rate' then floor(l.lo * (100 - t.value) / 100.0) when 'amount' then l.lo - t.value else t.value end)::bigint
             from public.mall_builder_product_volume_tiers t where t.product_id = l.pid), l.lo))
         then l.fl end
  from l;
end;
$$;

-- ── E 공급사별 바로 판매 ──
alter table public.mall_builder_suppliers add column if not exists auto_approve boolean not null default false;

create or replace function public.mall_builder_supplier_set_auto(p_id uuid, p_auto boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.mall_builder_suppliers%rowtype;
begin
  select * into s from public.mall_builder_suppliers x where x.id = p_id for update;
  if s.id is null or auth.uid() is null or not public.mall_builder_staff_can(s.store_id, 'products') then raise exception '공급사를 찾을 수 없습니다.'; end if;
  update public.mall_builder_suppliers set auto_approve = coalesce(p_auto, false), updated_at = now() where id = s.id;
  perform mall_builder_private.staff_log(s.store_id, 'supplier_auto', 'email', s.email, case when p_auto then '바로 판매' else '승인 후 판매' end);
end;
$$;

-- 공급사 상품 저장(0054b 교체): 바로 판매 공급사는 등록하면 바로 판매 중·승인됨, 고쳐도 승인 유지
create or replace function public.mall_builder_supplier_product_save(p_store_id uuid, p_product_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sid uuid := public.mall_builder_my_supplier_id(p_store_id);
  v_auto boolean;
  v_old public.mall_builder_products%rowtype;
  v_old_supply bigint;
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_summary text := left(btrim(coalesce(p ->> 'summary', '')), 200);
  v_desc text := left(coalesce(p ->> 'description', ''), 20000);
  v_supply bigint;
  v_base bigint;
  v_tax text := coalesce(nullif(p ->> 'tax_type', ''), 'taxable');
  v_mode text := coalesce(nullif(p ->> 'stock_mode', ''), 'none');
  v_stock int;
  v_images jsonb := coalesce(p -> 'images', '[]'::jsonb);
  v_id uuid;
  v_only_stock boolean;
begin
  if auth.uid() is null or v_sid is null then raise exception '입점 중인 공급사만 상품을 올릴 수 있습니다.'; end if;
  select x.auto_approve into v_auto from public.mall_builder_suppliers x where x.id = v_sid;
  if char_length(v_name) not between 1 and 100 then raise exception '상품 이름을 1~100자로 적어 주세요.'; end if;
  begin
    v_supply := (p ->> 'supply_price')::bigint;
    v_base := nullif(p ->> 'base_price', '')::bigint;
    v_stock := coalesce(nullif(p ->> 'stock', '')::int, 0);
  exception when others then raise exception '공급가·판매가·재고는 숫자로 적어 주세요.';
  end;
  if v_supply is null or v_supply < 0 or v_supply > 1000000000 then raise exception '공급가를 0원 이상으로 적어 주세요.'; end if;
  if v_tax not in ('taxable', 'exempt') then raise exception '과세 구분을 확인해 주세요.'; end if;
  if v_mode not in ('none', 'product') then raise exception '재고 관리 방식을 확인해 주세요.'; end if;
  if v_stock < 0 or v_stock > 1000000 then raise exception '재고를 0 이상으로 적어 주세요.'; end if;
  if not mall_builder_private.supplier_images_ok(v_images, p_store_id::text || '/supplier/' || v_sid::text || '/') then
    raise exception '사진은 공급사 화면에서 올린 것만, 5장까지 쓸 수 있습니다.';
  end if;

  if p_product_id is null then
    if v_base is null or v_base < v_supply then raise exception '희망 판매가는 공급가 이상으로 적어 주세요.'; end if;
    if (select count(*) from public.mall_builder_products x where x.supplier_id = v_sid) >= 500 then raise exception '공급사 한 곳당 상품은 500개까지 올릴 수 있습니다.'; end if;
    insert into public.mall_builder_products (store_id, name, summary, description, base_price, tax_type, status, stock_mode, stock, images, supplier_id, approval, approval_note, approval_at)
    values (p_store_id, v_name, v_summary, v_desc, v_base, v_tax, case when v_auto then 'on_sale' else 'draft' end, v_mode, v_stock, v_images, v_sid,
            case when v_auto then 'approved' else 'pending' end, '', case when v_auto then now() end)
    returning id into v_id;
    insert into public.mall_builder_product_supply (product_id, store_id, supplier_id, supply_price) values (v_id, p_store_id, v_sid, v_supply);
    return v_id;
  end if;

  select * into v_old from public.mall_builder_products x where x.id = p_product_id and x.store_id = p_store_id for update;
  if v_old.id is null or v_old.supplier_id is distinct from v_sid then raise exception '내 상품을 찾을 수 없습니다.'; end if;
  select s.supply_price into v_old_supply from public.mall_builder_product_supply s where s.product_id = v_old.id;
  v_only_stock := v_old.name = v_name and v_old.summary = v_summary and v_old.description = v_desc and v_old_supply is not distinct from v_supply
              and v_old.tax_type = v_tax and v_old.images = v_images;
  -- 바로 판매 공급사인데 판매가가 새 공급가보다 낮아지면 판매가를 공급가로 올린다(하한 보호와 별개로 표시 가격도 맞춤)
  update public.mall_builder_products
     set name = v_name, summary = v_summary, description = v_desc, tax_type = v_tax,
         stock_mode = v_mode, stock = v_stock, images = v_images, updated_at = now(),
         base_price = case when v_auto and base_price < v_supply then v_supply else base_price end,
         approval = case when v_only_stock then approval when v_auto then 'approved' else 'pending' end,
         approval_note = case when v_only_stock then approval_note else '' end,
         approval_at = case when not v_only_stock and v_auto then now() else approval_at end
   where id = v_old.id;
  insert into public.mall_builder_product_supply (product_id, store_id, supplier_id, supply_price) values (v_old.id, p_store_id, v_sid, v_supply)
  on conflict (product_id) do update set supply_price = excluded.supply_price, updated_at = now();
  return v_old.id;
end;
$$;

-- ── 주문 함수 두 개에 등급 할인 결정·공급가 하한 넣기(문구가 정확히 1번 나올 때만 바꿈) ──
create or replace function pg_temp.swap(src text, a text, b text, what text) returns text language plpgsql as $f$
begin
  if (char_length(src) - char_length(replace(src, a, ''))) / char_length(a) <> 1 then raise exception '문구를 1번 찾지 못함: %', what; end if;
  return replace(src, a, b);
end $f$;

do $m$
declare
  src text;
  floor_block constant text := E'    v_floor := mall_builder_private.price_floor(v_line.product_id, v_base);\n    if v_floor is not null and v_unit < v_floor then\n      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(''label'', ''최저 판매가 보호'', ''amount'', v_floor - v_unit));\n      v_unit := v_floor;\n    end if;\n    if v_line.qty < v_line.moq then raise exception';
begin
  -- 회원 주문
  src := pg_get_functiondef('public.mall_builder_place_order_v2(uuid,uuid,text,text,bigint,text,uuid,bigint)'::regprocedure);
  src := pg_temp.swap(src, 'gp.price as grade_price, gp.discount_rate as grade_rate', 'gr.price as grade_price, gr.rate as grade_rate', 'v2 등급 칸');
  src := pg_temp.swap(src, 'left join public.mall_builder_product_grade_prices gp on gp.product_id = p.id and gp.grade_id = v_customer.grade_id',
                           'left join lateral mall_builder_private.grade_resolve(p.id, v_customer.grade_id) gr on true', 'v2 등급 붙이기');
  src := pg_temp.swap(src, E'  v_unit bigint;\n', E'  v_unit bigint;\n  v_floor bigint;\n', 'v2 변수');
  src := pg_temp.swap(src, '    if v_line.qty < v_line.moq then raise exception', floor_block, 'v2 하한');
  execute src;
  -- 비회원 주문(등급 없음 — 하한만)
  src := pg_get_functiondef('public.mall_builder_place_guest_order(uuid,jsonb,jsonb,jsonb,text,text,bigint)'::regprocedure);
  src := pg_temp.swap(src, E'  v_unit bigint;\n', E'  v_unit bigint;\n  v_floor bigint;\n', '비회원 변수');
  src := pg_temp.swap(src, '    if v_line.qty < v_line.moq then raise exception', floor_block, '비회원 하한');
  execute src;
end $m$;

-- ── 권한(별도 마이그레이션 0057_grade_discounts_b로 적용 — 등급 지우기 함수와 함께) ──
revoke all on function public.mall_builder_grade_save(uuid, uuid, text, boolean, int, int) from public, anon;
revoke all on function public.mall_builder_grade_delete(uuid) from public, anon;
revoke all on function public.mall_builder_customer_set_grade(uuid, uuid) from public, anon;
revoke all on function public.mall_builder_supplier_set_auto(uuid, boolean) from public, anon;
grant execute on function public.mall_builder_grade_save(uuid, uuid, text, boolean, int, int) to authenticated;
grant execute on function public.mall_builder_grade_delete(uuid) to authenticated;
grant execute on function public.mall_builder_customer_set_grade(uuid, uuid) to authenticated;
grant execute on function public.mall_builder_supplier_set_auto(uuid, boolean) to authenticated;
grant execute on function public.mall_builder_price_rules_for(uuid, uuid[], uuid) to anon, authenticated;
revoke all on function mall_builder_private.grade_resolve(uuid, uuid) from public, anon, authenticated;
revoke all on function mall_builder_private.price_floor(uuid, bigint) from public, anon, authenticated;
