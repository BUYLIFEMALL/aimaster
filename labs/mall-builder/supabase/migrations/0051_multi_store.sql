-- D31 몰 여러 개 운영 — 대표 1명당 몰 5개까지(2026-11-11 주인님 「추천안 3가지 그대로」)
-- 1. 회원 1명당 몰 1개 고유 색인을 지우고, 몰 만들기 함수의 검사를 「5개까지」로 바꾼다(함수의 그 한 곳만 바꿈)
-- 2. 새 몰을 기존 몰 설정으로 시작: 카테고리(위아래 관계 유지)·배송비 정책·회원 등급(같은 코드는 덮어씀)·사업자 정보와 몰 설정.
--    상품·손님·주문·비밀 키(문자·결제·AI·세금계산서 — 다른 표)는 복사하지 않는다. 두 몰 모두 내가 대표일 때만.

drop index if exists public.mall_builder_stores_one_per_owner;

do $$
declare
  d text;
  sig constant text := 'public.mall_builder_create_store(text,text)';
  pat1 constant text := 'if exists (select 1 from public.mall_builder_stores where owner_id = v_uid) then';
  rep1 constant text := 'perform pg_advisory_xact_lock(hashtext(''mall_builder_create_store:'' || v_uid::text));
  if (select count(*) from public.mall_builder_stores where owner_id = v_uid) >= 5 then';
  pat2 constant text := '이미 개설한 몰이 있습니다(1차는 회원 1명당 몰 1개).';
  rep2 constant text := '몰은 대표 1명당 5개까지 만들 수 있습니다.';
begin
  d := pg_get_functiondef(sig::regprocedure);
  if position('>= 5 then' in d) > 0 then raise notice '이미 적용돼 있습니다 — 건너뜀'; return; end if;
  if (length(d) - length(replace(d, pat1, ''))) / length(pat1) <> 1 then raise exception '바꿀 자리 1이 1번이 아닙니다 — 멈춤'; end if;
  if (length(d) - length(replace(d, pat2, ''))) / length(pat2) <> 1 then raise exception '바꿀 자리 2가 1번이 아닙니다 — 멈춤'; end if;
  execute replace(replace(d, pat1, rep1), pat2, rep2);
end $$;

create or replace function public.mall_builder_copy_store_setup(p_to uuid, p_from uuid, p_parts text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_map jsonb := '{}'::jsonb;
  v_new uuid;
  c record;
  v_cats integer := 0;
  v_ship integer := 0;
  v_grades integer := 0;
  v_biz boolean := false;
begin
  if p_to = p_from then raise exception '같은 몰에서 복사할 수 없습니다.'; end if;
  if not (public.mall_builder_is_store_owner(p_to) and public.mall_builder_is_store_owner(p_from)) then
    raise exception '두 몰 모두 내가 대표인 몰이어야 복사할 수 있습니다.';
  end if;
  if 'categories' = any(p_parts) then
    if exists (select 1 from public.mall_builder_categories where store_id = p_to) then raise exception '이미 카테고리가 있는 몰에는 카테고리를 복사하지 않습니다.'; end if;
    for c in select * from public.mall_builder_categories where store_id = p_from order by depth, sort, created_at loop
      insert into public.mall_builder_categories (store_id, parent_id, name, depth, sort, is_visible)
      values (p_to, case when c.parent_id is null then null else (v_map ->> c.parent_id::text)::uuid end, c.name, c.depth, c.sort, c.is_visible)
      returning id into v_new;
      v_map := v_map || jsonb_build_object(c.id::text, v_new);
      v_cats := v_cats + 1;
    end loop;
  end if;
  if 'shipping' = any(p_parts) then
    if exists (select 1 from public.mall_builder_shipping_policies where store_id = p_to) then raise exception '이미 배송비 정책이 있는 몰에는 배송비를 복사하지 않습니다.'; end if;
    insert into public.mall_builder_shipping_policies (store_id, name, type, base_fee, free_over, jeju_fee, island_fee, is_default)
    select p_to, name, type, base_fee, free_over, jeju_fee, island_fee, is_default from public.mall_builder_shipping_policies where store_id = p_from order by is_default desc, created_at;
    get diagnostics v_ship = row_count;
  end if;
  if 'grades' = any(p_parts) then
    insert into public.mall_builder_customer_grades (store_id, code, name, rank, is_business, point_rate)
    select p_to, code, name, rank, is_business, point_rate from public.mall_builder_customer_grades where store_id = p_from
    on conflict (store_id, code) do update set name = excluded.name, rank = excluded.rank, is_business = excluded.is_business, point_rate = excluded.point_rate;
    get diagnostics v_grades = row_count;
  end if;
  if 'business' = any(p_parts) then
    update public.mall_builder_stores t set business_info = f.business_info, settings = f.settings, updated_at = now()
      from public.mall_builder_stores f where t.id = p_to and f.id = p_from;
    v_biz := true;
  end if;
  return jsonb_build_object('categories', v_cats, 'shipping', v_ship, 'grades', v_grades, 'business', v_biz);
end $$;
