-- AI 쇼핑몰 빌더 M3-S1 남은 일 — 수수료율 몰에서 공급사 옵션 칸을 「추가 공급가」 → 「추가 판매가」로 (2026-11-15 마스터 플랜 §4 M3-S1)
-- 백엔드 DB 번호 0090~0099(상호 인수인계 §2).
-- 수수료율 몰(supply_mode = 'rate')은 공급사가 판매가·리셀러율을 정하고 공급가는 계산된다(0068). 옵션도 같게:
--   공급사가 조합마다 「추가 판매가」(extra_sale)를 적으면 그 값이 그대로 유저 판매 추가금(product_variants.extra_price)이 되고,
--   추가 공급가(variant_supply.extra_supply)는 0068 트리거가 같은 두 율로 계산한다.
-- 예전에는 수수료율 몰에서도 추가 공급가를 받아 판매 추가금을 거꾸로 계산했는데, 원 단위 버림 때문에 저장한 추가 공급가가
--   적은 값과 1원씩 어긋나 아무것도 안 바꿔도 「바뀜 → 다시 승인 대기」가 될 수 있었다 → 판매 추가금끼리 비교로 바꾼다.
-- 옛 방식(공급가 직접 입력 몰, 또는 extra_sale 없이 보낸 요청)은 그대로(하위 호환 — 새 화면이 나가기 전 옛 화면이 불러도 동작).
-- 함수 하나만 다시 만듦(표·칸 없음). 문구는 용어 통일(운영사·유저) 기준.

create or replace function public.mall_builder_supplier_options_save(p_product_id uuid, p_groups jsonb, p_variants jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v public.mall_builder_products%rowtype;
  v_sid uuid;
  v_auto boolean;
  v_supply bigint;
  v_rate boolean;
  v_groups jsonb := coalesce(p_groups, '[]'::jsonb);
  v_vars jsonb := coalesce(p_variants, '[]'::jsonb);
  v_glen int;
  e jsonb;
  v_key text;
  v_sale_in boolean;
  v_extra bigint;
  v_stock int;
  v_old_extra bigint;
  v_old_sale bigint;
  v_vid uuid;
  v_changed boolean := false;
  v_sort int := 0;
begin
  select * into v from public.mall_builder_products x where x.id = p_product_id for update;
  if v.id is null or auth.uid() is null then raise exception '내 상품을 찾을 수 없습니다.'; end if;
  v_sid := public.mall_builder_my_supplier_id(v.store_id);
  if v_sid is null or v.supplier_id is distinct from v_sid then raise exception '내 상품을 찾을 수 없습니다.'; end if;
  select x.auto_approve into v_auto from public.mall_builder_suppliers x where x.id = v_sid;
  select s.supply_price into v_supply from public.mall_builder_product_supply s where s.product_id = v.id;
  select st.supply_mode = 'rate' into v_rate from public.mall_builder_stores st where st.id = v.store_id;
  v_rate := coalesce(v_rate, false);

  if jsonb_typeof(v_groups) <> 'array' or jsonb_array_length(v_groups) > 3 then raise exception '옵션은 3단까지 만들 수 있습니다.'; end if;
  if jsonb_typeof(v_vars) <> 'array' or jsonb_array_length(v_vars) > 300 then raise exception '옵션 조합은 300개까지입니다.'; end if;
  v_glen := jsonb_array_length(v_groups);
  if (v_glen = 0) <> (jsonb_array_length(v_vars) = 0) then raise exception '옵션과 조합 목록이 맞지 않습니다. 「조합 만들기」를 눌러 주세요.'; end if;

  -- 조합 검사: 값 개수 = 옵션 단 수, 열쇠 = 값을 " / "로 이은 것, 금액·재고 범위
  for e in select * from jsonb_array_elements(v_vars) loop
    v_key := coalesce(e ->> 'key', '');
    v_sale_in := v_rate and e ? 'extra_sale';
    if jsonb_typeof(e -> 'values') <> 'array' or jsonb_array_length(e -> 'values') <> v_glen
       or v_key <> (select string_agg(x, ' / ' order by n) from jsonb_array_elements_text(e -> 'values') with ordinality t(x, n))
       or char_length(v_key) not between 1 and 200 then
      raise exception '옵션 조합 「%」을(를) 읽지 못했습니다. 「조합 만들기」를 다시 눌러 주세요.', left(v_key, 50);
    end if;
    begin
      v_extra := coalesce(nullif(e ->> (case when v_sale_in then 'extra_sale' else 'extra_supply' end), '')::bigint, 0);
      v_stock := coalesce(nullif(e ->> 'stock', '')::int, 0);
    exception when others then
      raise exception '「%」의 %·재고는 숫자로 적어 주세요.', v_key, case when v_sale_in then '추가 판매가' else '추가 공급가' end;
    end;
    if v_extra < 0 or v_extra > 1000000000 then
      raise exception '「%」 %를 0원 이상으로 적어 주세요.', v_key, case when v_sale_in then '추가 판매가' else '추가 공급가' end;
    end if;
    if v_stock < 0 or v_stock > 1000000 then raise exception '「%」 재고를 0 이상으로 적어 주세요.', v_key; end if;
    if char_length(coalesce(e ->> 'sku', '')) > 50 then raise exception '「%」 품번은 50자 이내로 적어 주세요.', v_key; end if;
  end loop;

  -- 옵션 구성이 바뀌었나
  if v.option_groups is distinct from v_groups then v_changed := true; end if;
  -- 없어진 조합 지우기(추가 공급가 줄도 함께 지워짐)
  if exists (select 1 from public.mall_builder_product_variants pv where pv.product_id = v.id
              and pv.key not in (select x ->> 'key' from jsonb_array_elements(v_vars) x)) then
    v_changed := true;
    delete from public.mall_builder_product_variants pv where pv.product_id = v.id
       and pv.key not in (select x ->> 'key' from jsonb_array_elements(v_vars) x);
  end if;

  for e in select * from jsonb_array_elements(v_vars) loop
    v_key := e ->> 'key';
    v_sale_in := v_rate and e ? 'extra_sale';
    v_extra := coalesce(nullif(e ->> (case when v_sale_in then 'extra_sale' else 'extra_supply' end), '')::bigint, 0);
    v_vid := null; v_old_extra := null; v_old_sale := null;
    select pv.id, pv.extra_price, vs.extra_supply into v_vid, v_old_sale, v_old_extra
      from public.mall_builder_product_variants pv left join public.mall_builder_variant_supply vs on vs.variant_id = pv.id
     where pv.product_id = v.id and pv.key = v_key;
    if v_sale_in then
      -- 수수료율 몰: 공급사가 적은 추가 판매가가 곧 판매 추가금, 바뀜 판단도 판매 추가금끼리
      if v_vid is null or v_old_sale is distinct from v_extra then v_changed := true; end if;
    elsif v_vid is null or v_old_extra is distinct from v_extra then
      v_changed := true;
    end if;
    insert into public.mall_builder_product_variants (product_id, store_id, key, "values", extra_price, stock, sku, is_active, sort)
    values (v.id, v.store_id, v_key, e -> 'values',
            case when v_sale_in then v_extra
                 -- 추가 공급가가 그대로면 운영사가 정한 판매 추가금 유지, 새 조합·바뀐 조합은 마진 비율 기본값
                 when v_vid is not null and v_old_extra is not distinct from v_extra then v_old_sale
                 else mall_builder_private.default_extra_sale(v_extra, v.base_price, v_supply) end,
            coalesce(nullif(e ->> 'stock', '')::int, 0), coalesce(e ->> 'sku', ''), coalesce((e ->> 'is_active')::boolean, true), v_sort)
    on conflict (product_id, key) do update
      set "values" = excluded."values", extra_price = excluded.extra_price, stock = excluded.stock, sku = excluded.sku,
          is_active = excluded.is_active, sort = excluded.sort
    returning id into v_vid;
    -- 수수료율 몰은 0068 트리거(mall_builder_variant_supply_rate)가 판매 추가금·두 율로 extra_supply를 다시 계산
    insert into public.mall_builder_variant_supply (variant_id, product_id, store_id, supplier_id, extra_supply)
    values (v_vid, v.id, v.store_id, v_sid, case when v_sale_in then 0 else v_extra end)
    on conflict (variant_id) do update set extra_supply = excluded.extra_supply, updated_at = now();
    v_sort := v_sort + 1;
  end loop;

  update public.mall_builder_products
     set option_groups = v_groups, updated_at = now(),
         approval = case when not v_changed then approval when v_auto then 'approved' else 'pending' end,
         approval_note = case when v_changed then '' else approval_note end,
         approval_at = case when v_changed and v_auto then now() else approval_at end
   where id = v.id;
  return case when not v_changed then 'kept' when v_auto then 'approved' else 'pending' end;
end;
$$;
